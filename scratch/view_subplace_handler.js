const fs = require('fs');
const content = fs.readFileSync('g:/Varun/Projects/Job Connect/client/src/pages/AdminSettings.jsx', 'utf8');

const lines = content.split('\n');
let startLine = -1;
lines.forEach((line, index) => {
    if (line.includes("const handleAddSubPlaces") || line.includes("handleAddSubPlaces =")) {
        startLine = index;
    }
});

if (startLine !== -1) {
    console.log(lines.slice(startLine, startLine + 35).join('\n'));
} else {
    console.log("Not found");
}
