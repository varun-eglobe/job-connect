const fs = require('fs');

function findInFile(filePath, term) {
    console.log(`--- Searching for "${term}" in ${filePath} ---`);
    if (!fs.existsSync(filePath)) {
        console.log('File does not exist');
        return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (line.toLowerCase().includes(term.toLowerCase())) {
            console.log(`${index + 1}: ${line.trim()}`);
        }
    });
}

findInFile('client/src/pages/EmployerDashboard.jsx', 'age_range');
findInFile('server/server.js', 'age_range');
findInFile('server/server.js', 'app.post(\'/api/jobs\'');
findInFile('server/server.js', 'app.put(\'/api/jobs/:id\'');
