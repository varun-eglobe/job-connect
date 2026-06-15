const fs = require('fs');
const content = fs.readFileSync('g:/Varun/Projects/Job Connect/client/src/pages/AdminSettings.jsx', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes("activeTab === 'locations'") || line.includes("newLocation")) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
