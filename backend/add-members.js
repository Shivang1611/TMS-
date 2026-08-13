const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const usersToAdd = [
  { name: 'Diptanil Sarkar', email: 'diptanilsarkar98@gmail.com', role: 'Employee', jobTitle: 'Staff' },
  { name: 'HackerX', email: 'hacker@proton', role: 'Admin', jobTitle: 'Superadmin' },
  { name: 'Shivani', email: 'shivanipandey56789@gmail.com', role: 'Employee', jobTitle: 'Counsellor' },
  { name: 'Jaswin', email: 'jaswinraj6@gmail.com', role: 'Employee', jobTitle: 'Counsellor' },
  { name: 'Anjali', email: 'anshu@gmail.com', role: 'Employee', jobTitle: 'Author' },
  { name: 'Tanishka', email: 'tanishkasingh835@gmail.com', role: 'Employee', jobTitle: 'Staff' },
  { name: 'Shrasti Agnihotri', email: 'maniagnihotri212@gmail.com', role: 'Employee', jobTitle: 'Staff' },
  { name: 'Aditi', email: 'paladiti013@gmail.com', role: 'Employee', jobTitle: 'Author' },
  { name: 'Deeksha Mishra', email: 'deekshamishra415@gmail.com', role: 'Employee', jobTitle: 'Author' },
  { name: 'Manthan Singhal', email: 'manthan.s1509@gmail.com', role: 'Employee', jobTitle: 'Author' },
  { name: 'Sukhwinder Singh', email: 'sukhwindersingh44033@gmail.com', role: 'Employee', jobTitle: 'Author' },
  { name: 'Sumit', email: 'sumitdiwakar476@gmail.com', role: 'Employee', jobTitle: 'Author' },
  { name: 'Kartikey Singh', email: 'ks9452855@gmail.com', role: 'Employee', jobTitle: 'Counsellor' },
  { name: 'PRASHANT SARASWAT', email: 'prashantsaraswat036@gmail.com', role: 'Employee', jobTitle: 'Staff' },
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const defaultOrgId = '6a60b23730fcc43a7a151fd0'; // From earlier query
    
    for (const u of usersToAdd) {
      // Check if user already exists
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        console.log(`User ${u.email} already exists.`);
        continue;
      }
      
      const newUser = new User({
        name: u.name,
        email: u.email,
        password: '11223344', // Will be automatically hashed by pre-save hook
        role: u.role,
        organization: defaultOrgId,
        profile: {
          jobTitle: u.jobTitle
        }
      });
      await newUser.save();
      console.log(`Added ${u.name} (${u.email})`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
