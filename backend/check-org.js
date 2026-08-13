const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const shiva = await User.findOne({ email: 'bdeshukla840@gmail.com' });
  console.log(`Shiva Org ID: ${shiva.organization.toString()}`);
  process.exit(0);
});
