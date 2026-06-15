const fs = require('fs');
const content = fs.readFileSync('g:\\\\Varun\\\\Projects\\\\Job Connect\\\\client\\\\dist\\\\assets\\\\index-Cmmi5Vnq.js', 'utf8');

const strings = ['Employer Dashboard', 'Post a Job', 'Active Listings', 'Manage your listings', 'Your Recent Listings'];
strings.forEach(str => {
  let idx = -1;
  while ((idx = content.indexOf(str, idx + 1)) !== -1) {
    console.log(`Found string "${str}" at index: ${idx}`);
  }
});
