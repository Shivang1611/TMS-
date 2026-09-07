const { User, TaskScoreLog } = require('../models');

const tierConfig = [
  { min: 500, name: "Elite",     color: "#E8D9F0" },
  { min: 301, name: "Excellent", color: "#FAF6CF" },
  { min: 151, name: "Great",     color: "#C9F1E2" },
  { min: 51,  name: "Good",      color: "#D6E4F0" },
  { min: 0,   name: "Beginner",  color: "#E4E4E4" },
];

function getTier(score) {
  return tierConfig.find(t => score >= t.min);
}

const SCOPE_POINTS = {
  'Quick': 5,
  'Half Day': 10,
  'Full Day': 20,
  'Multi-Day': 35,
};

const PRIORITY_MULTIPLIER = {
  'Critical': 1.4,
  'High': 1.2,
  'Medium': 1.0,
  'Low': 0.8,
};

const RATING_MULTIPLIER = {
  'Outstanding': 1.2,
  'Good': 1.0,
  'Needs Polish': 0.75,
};

function calculateTaskPoints(task, overrides = {}) {
  // 1. Direct manual admin override if specified
  if (overrides.customMarks !== undefined && overrides.customMarks !== null && overrides.customMarks !== '' && !isNaN(Number(overrides.customMarks))) {
    const points = Math.max(0, Math.round(Number(overrides.customMarks)));
    return { points, reason: `custom_override_${points}_pts` };
  }

  // 2. Determine work scope: explicitly passed -> task property -> effort-based fallback -> 'Half Day' default
  let workScope = overrides.workScope || task.workScope;
  if (!workScope || !SCOPE_POINTS[workScope]) {
    if (task.estimatedEffort >= 6) workScope = 'Full Day';
    else if (task.estimatedEffort > 0 && task.estimatedEffort <= 2) workScope = 'Quick';
    else workScope = 'Half Day';
  }

  const basePoints = SCOPE_POINTS[workScope] || 10;
  const priorityMult = PRIORITY_MULTIPLIER[task.priority] || 1.0;
  
  const adminRating = overrides.adminRating || task.adminRating || 'Good';
  const ratingMult = RATING_MULTIPLIER[adminRating] || 1.0;

  // 3. Timeliness evaluation
  let onTime = true;
  if (task.dueDate) {
    const endOfDueDate = new Date(task.dueDate);
    endOfDueDate.setUTCHours(23, 59, 59, 999);
    const completionDate = task.completedAt || new Date();
    onTime = completionDate <= endOfDueDate;
  }

  // 30% penalty if completed late (instead of 0 points), so partial credit is preserved
  const timelinessMult = onTime ? 1.0 : 0.7;
  const reworkMult = task.reworkNeeded ? 0.8 : 1.0;

  const rawCalculated = basePoints * priorityMult * ratingMult * timelinessMult * reworkMult;
  const points = Math.max(1, Math.round(rawCalculated));

  const reason = `${workScope.toLowerCase().replace(/\s+/g, '_')}_${(task.priority || 'medium').toLowerCase()}_${adminRating.toLowerCase().replace(/\s+/g, '_')}${onTime ? '' : '_late'}`;

  return { points, reason };
}

async function processTaskCompletion(task, overrides = {}) {
  if (!task.assignees || task.assignees.length === 0) return;

  const { points, reason } = calculateTaskPoints(task, overrides);
  task.pointsAwarded = points;
  
  for (const assigneeId of task.assignees) {
    // Log the points
    await TaskScoreLog.create({
      employee: assigneeId,
      task: task._id,
      pointsAwarded: points,
      reason,
    });

    // Update user score
    if (points > 0) {
      const user = await User.findById(assigneeId);
      if (user) {
        user.score += points;
        user.tier = getTier(user.score).name;
        await user.save();
      }
    }
  }
}

async function processTaskReopen(task) {
  if (!task.assignees || task.assignees.length === 0) {
    task.reworkNeeded = true;
    return;
  }

  const GRACE_PERIOD_MINUTES = 15;
  const isGracePeriod = task.completedAt && (new Date() - new Date(task.completedAt)) < GRACE_PERIOD_MINUTES * 60000;

  for (const assigneeId of task.assignees) {
    // Find the last score log for this task and this assignee
    const lastLog = await TaskScoreLog.findOne({
      employee: assigneeId,
      task: task._id,
      pointsAwarded: { $gt: 0 }
    }).sort({ createdAt: -1 });

    let reversedPoints = 0;
    if (lastLog) {
      reversedPoints = lastLog.pointsAwarded;
      // Log the reversal
      await TaskScoreLog.create({
        employee: assigneeId,
        task: task._id,
        pointsAwarded: -reversedPoints,
        reason: isGracePeriod ? "accidental_completion_reversal" : "task_reopened_reversal",
      });

      // Update user score
      const user = await User.findById(assigneeId);
      if (user) {
        user.score = Math.max(0, user.score - reversedPoints);
        user.tier = getTier(user.score).name;
        await user.save();
      }
    }
  }

  if (!isGracePeriod) {
    // Mark task as needing rework (it was reopened after grace period)
    task.reworkNeeded = true;
  }
  // The task save will be handled by the controller
}

async function recalculateTaskScore(task) {
  if (task.status !== 'Done') return;
  if (!task.assignees || task.assignees.length === 0) return;

  const { points, reason } = calculateTaskPoints(task);
  
  for (const assigneeId of task.assignees) {
    // Reversal of previous point grants
    const previousLogs = await TaskScoreLog.find({
      employee: assigneeId,
      task: task._id,
      pointsAwarded: { $ne: 0 }
    });

    let netAwarded = 0;
    for (const log of previousLogs) {
      netAwarded += log.pointsAwarded;
    }

    if (netAwarded !== points) {
       const difference = points - netAwarded;
       await TaskScoreLog.create({
         employee: assigneeId,
         task: task._id,
         pointsAwarded: difference,
         reason: "task_recalculated_" + reason,
       });

       const user = await User.findById(assigneeId);
       if (user) {
         user.score = Math.max(0, user.score + difference);
         user.tier = getTier(user.score).name;
         await user.save();
       }
    } else if (points === 0) {
       // Log that a recalculation happened but no points changed
       await TaskScoreLog.create({
         employee: assigneeId,
         task: task._id,
         pointsAwarded: 0,
         reason: "task_recalculated_" + reason,
       });
    }
  }
}

module.exports = {
  tierConfig,
  getTier,
  calculateTaskPoints,
  processTaskCompletion,
  processTaskReopen,
  recalculateTaskScore,
};
