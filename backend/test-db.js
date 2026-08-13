const mongoose = require('mongoose');
const { Project, Team } = require('./src/models');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const projects = await Project.find({}).populate('teams');
  console.log("Projects:");
  projects.forEach(p => {
    console.log(`- ${p.name}: Teams: ${p.teams.map(t => t.name).join(', ')}`);
  });
  process.exit(0);
});
