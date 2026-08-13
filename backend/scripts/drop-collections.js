/**
 * Drop all collections from the database so Mongoose recreates them
 * with fresh schema validation on next server start.
 *
 * Usage: node scripts/drop-collections.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

async function resetDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tms';

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected to:', mongoose.connection.host);
  console.log('Database:', mongoose.connection.db.databaseName);

  // Drop the entire database — Mongoose will recreate collections
  // with correct schemas and indexes on next server start
  await mongoose.connection.dropDatabase();
  console.log('Database dropped and reset. All collections will be recreated on next server start.');

  await mongoose.disconnect();
  console.log('Done.');
}

resetDatabase().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
