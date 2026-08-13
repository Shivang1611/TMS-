const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.collections();
    
    for (let collection of collections) {
      await collection.drop();
      console.log(`Dropped collection: ${collection.collectionName}`);
    }
    
    console.log("Successfully wiped all data for a fresh start.");
  } catch (err) {
    console.error("Error wiping database:", err);
  } finally {
    process.exit(0);
  }
});
