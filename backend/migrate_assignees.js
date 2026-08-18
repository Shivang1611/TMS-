require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const Task = require('./src/models/Task');

  // We are using bulkWrite to update tasks efficiently
  // Actually we need to query raw because mongoose model might not let us query `assignee` if we removed it from schema.
  // We can query with `{ assignee: { $exists: true, $ne: null } }` on the collection directly.
  const collection = mongoose.connection.collection('tasks');
  const tasks = await collection.find({ assignee: { $exists: true, $ne: null } }).toArray();
  console.log(`Found ${tasks.length} tasks with single assignee.`);

  let updated = 0;
  for (const task of tasks) {
    if (!task.assignees || task.assignees.length === 0) {
      await collection.updateOne(
        { _id: task._id },
        { 
          $set: { assignees: [task.assignee] },
          $unset: { assignee: 1 } 
        }
      );
      updated++;
    }
  }

  console.log(`Migrated ${updated} tasks.`);
  mongoose.connection.close();
}

migrate().catch(console.error);
