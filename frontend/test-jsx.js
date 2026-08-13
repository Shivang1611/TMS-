const fs = require('fs');
const content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
let openDivs = 0;
let lines = content.split('\n');
lines.forEach((line, i) => {
  const openMatches = line.match(/<div(\s|>)/g);
  const closeMatches = line.match(/<\/div>/g);
  if (openMatches) openDivs += openMatches.length;
  if (closeMatches) openDivs -= closeMatches.length;
  if (openDivs < 0) console.log(`Unbalanced at line ${i+1}: ${line}`);
});
console.log('Total open divs remaining:', openDivs);
