require('dotenv').config();
const mongoose = require('mongoose');
const Reminder = require('./src/models/Reminder');
const User = require('./src/models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const reminders = await Reminder.find().sort({ createdAt: -1 }).limit(3).populate('user', 'email name');
  console.log("Latest reminders:");
  reminders.forEach(r => {
    console.log(`- Title: ${r.title}`);
    console.log(`  DateTime: ${r.dateTime} (Local: ${r.dateTime.toLocaleString()})`);
    console.log(`  Completed: ${r.isCompleted}, EmailSent: ${r.emailSent}`);
    console.log(`  User: ${r.user?.email}`);
  });
  process.exit(0);
}
run();
