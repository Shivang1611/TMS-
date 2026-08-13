const mongoose = require('mongoose');
const { Task, User } = require('./src/models');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const aditi = await User.findOne({ name: 'Aditi' });
  const tasks = await Task.find({ assignee: aditi._id });
  console.log("Tasks for Aditi:", tasks.length);
  if(tasks.length > 0) {
    console.log("Task examples:", tasks.map(t => ({ title: t.title, assignee: t.assignee, isDeleted: t.isDeleted })));
  }
  process.exit(0);
});
