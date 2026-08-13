const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const usersToUpdate = [
  'diptanilsarkar98@gmail.com',
  'hacker@proton',
  'shivanipandey56789@gmail.com',
  'jaswinraj6@gmail.com',
  'anshu@gmail.com',
  'tanishkasingh835@gmail.com',
  'maniagnihotri212@gmail.com',
  'paladiti013@gmail.com',
  'deekshamishra415@gmail.com',
  'manthan.s1509@gmail.com',
  'sukhwindersingh44033@gmail.com',
  'sumitdiwakar476@gmail.com',
  'ks9452855@gmail.com',
  'prashantsaraswat036@gmail.com',
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const correctOrgId = '6a79c608f49d68e99d304462'; // Shiva's Org ID
    
    const result = await User.updateMany(
      { email: { $in: usersToUpdate } },
      { $set: { organization: correctOrgId } }
    );
    
    console.log(`Updated organization for ${result.modifiedCount} users.`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
