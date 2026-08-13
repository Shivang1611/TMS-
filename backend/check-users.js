const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const users = await User.find({});
  console.log(`Total users: ${users.length}`);
  users.forEach(u => console.log(`- ${u.name} (${u.email})`));
  process.exit(0);
});
