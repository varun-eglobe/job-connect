const fs = require('fs');
const content = fs.readFileSync('g:/Varun/Projects/Job Connect/server/server.js', 'utf8');

const lines = content.split('\n');
let startLine = -1;
lines.forEach((line, index) => {
    if (line.includes("app.post('/api/admin/locations'") || line.includes("post('/api/admin/locations'")) {
        startLine = index;
    }
});

if (startLine !== -1) {
    console.log(lines.slice(startLine, startLine + 30).join('\n'));
} else {
    console.log("Not found");
}
