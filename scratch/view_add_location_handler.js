const fs = require('fs');
const content = fs.readFileSync('g:/Varun/Projects/Job Connect/client/src/pages/AdminSettings.jsx', 'utf8');

const lines = content.split('\n');
let startLine = -1;
lines.forEach((line, index) => {
    if (line.includes("const handleAddLocation") || line.includes("handleAddLocation =")) {
        startLine = index;
    }
});

if (startLine !== -1) {
    console.log(lines.slice(startLine, startLine + 25).join('\n'));
} else {
    console.log("Not found");
}
