const mongoose = require('mongoose');

const taskScoreLogSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    pointsAwarded: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // createdAt acts as the log timestamp
  }
);

module.exports = mongoose.model('TaskScoreLog', taskScoreLogSchema);
