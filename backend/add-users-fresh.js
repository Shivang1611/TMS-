const mongoose = require('mongoose');
const User = require('./src/models/User');
const Organization = require('./src/models/Organization');
require('dotenv').config();

const usersToAdd = [
  { name: 'Shiva', email: 'bdeshukla840@gmail.com', role: 'Founder', jobTitle: 'Founder' }, // Re-added admin account
  { name: 'Shivang Shukla', email: 'shiangshukla306@gmail.com', role: 'Manager', jobTitle: 'Manager' },
  { name: 'Diptanil Sarkar', email: 'diptanilsarkar98@gmail.com', role: 'Employee', jobTitle: 'Staff' },
  { name: 'Tanishka', email: 'tanishkasingh835@gmail.com', role: 'Employee', jobTitle: 'Staff' },
  { name: 'Shrasti Agnihotri', email: 'maniagnihotri212@gmail.com', role: 'Employee', jobTitle: 'Staff' },
  { name: 'Aditi', email: 'paladiti013@gmail.com', role: 'Employee', jobTitle: 'Author' },
  { name: 'Deeksha Mishra', email: 'deekshamishra415@gmail.com', role: 'Employee', jobTitle: 'Author' },
  { name: 'Manthan Singhal', email: 'manthan.s1509@gmail.com', role: 'Employee', jobTitle: 'Author' },
  { name: 'Sukhwinder Singh', email: 'sukhwindersingh44033@gmail.com', role: 'Employee', jobTitle: 'Author' },
  { name: 'Sumit', email: 'sumitdiwakar476@gmail.com', role: 'Employee', jobTitle: 'Author' },
  { name: 'PRASHANT SARASWAT', email: 'prashantsaraswat036@gmail.com', role: 'Employee', jobTitle: 'Staff' }
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    // 1. Create Organization
    let org = await Organization.findOne({ name: 'Cadera Group' });
    if (!org) {
      org = await Organization.create({ name: 'Cadera Group' });
      console.log(`Created Organization: ${org.name}`);
    }

    // 2. Create Users
    for (const u of usersToAdd) {
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        console.log(`User ${u.email} already exists.`);
        continue;
      }
      
      const newUser = new User({
        name: u.name,
        email: u.email,
        password: '11223344', // Will be automatically hashed
        role: u.role,
        organization: org._id,
        profile: {
          jobTitle: u.jobTitle
        }
      });
      await newUser.save();
      console.log(`Added ${u.name} (${u.email}) as ${u.role}`);
    }
    console.log("All done! You can now log in.");
  } catch (err) {
    console.error("Error creating users:", err);
  } finally {
    process.exit(0);
  }
});
