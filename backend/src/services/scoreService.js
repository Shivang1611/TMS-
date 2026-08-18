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
  // If no due date, treat as on time
  const onTime = task.dueDate ? (task.completedAt <= task.dueDate) : true;
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
        reason: "task_reopened_reversal",
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

  // Mark task as needing rework (it was reopened)
  task.reworkNeeded = true;
  // The task save will be handled by the controller
}

module.exports = {
  tierConfig,
  getTier,
  calculateTaskPoints,
  processTaskCompletion,
  processTaskReopen,
};
