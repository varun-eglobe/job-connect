const fs = require('fs');
const content = fs.readFileSync('server/server.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('/api/pages') || line.includes('/api/admin/pages') || line.includes('cms_pages')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
