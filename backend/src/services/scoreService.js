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

function calculateTaskPoints(task) {
  let onTime = true;
  if (task.dueDate) {
    // dueDate from frontend usually comes as midnight UTC (e.g. 2026-08-18T00:00:00.000Z)
    // We should treat any completion on that day as "on time". 
    // Setting the due date comparison to the end of that day (23:59:59.999).
    const endOfDueDate = new Date(task.dueDate);
    endOfDueDate.setUTCHours(23, 59, 59, 999);
    onTime = task.completedAt <= endOfDueDate;
  }
  const noRework = !task.reworkNeeded;

  if (onTime && noRework) return { points: 15, reason: "on_time_no_rework" };
  if (onTime && !noRework) return { points: 5, reason: "on_time_rework" };
  return { points: 0, reason: "late" };
}

async function processTaskCompletion(task) {
  if (!task.assignees || task.assignees.length === 0) return;

  const { points, reason } = calculateTaskPoints(task);
  
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
