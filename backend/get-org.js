const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const user = await User.findOne({});
  console.log("Org ID:", user.organization.toString());
  process.exit(0);
});
