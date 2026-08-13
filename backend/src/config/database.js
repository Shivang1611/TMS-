const mongoose = require('mongoose');

const connectDatabase = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tms';

  try {
    await mongoose.connect(uri, {
      // Mongoose 8 uses these defaults:
      // - serverSelectionTimeoutMS: 5000
      // - heartbeatFrequencyMS: 10000
    });

    console.log('Connected to MongoDB:', mongoose.connection.host);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDatabase;
