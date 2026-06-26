const { execSync } = require('child_process');
const fs = require('fs');

try {
    const originalContent = execSync('git show origin/Job-Connect-Local-Chages:client/src/pages/AdminSettings.jsx', { maxBuffer: 10 * 1024 * 1024 }).toString();
    const lines = originalContent.split('\n');
    let start = -1;
    let end = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("activeTab === 'pages'")) {
            start = i;
            console.log(`Found activeTab === 'pages' at line ${i + 1}`);
            // Let's find where the block ends by tracking braces
            let braceCount = 0;
            for (let j = i; j < lines.length; j++) {
                const line = lines[j];
                for (let char of line) {
                    if (char === '{' || char === '(') braceCount++;
                    if (char === '}' || char === ')') braceCount--;
                }
                if (braceCount === 0 && j > i) {
                    end = j;
                    break;
                }
            }
            break;
        }
    }
    if (start !== -1 && end !== -1) {
        console.log(`Block ends at line ${end + 1}`);
        const block = lines.slice(start, end + 1).join('\n');
        fs.writeFileSync('scratch/pages_block.txt', block);
        console.log('Successfully wrote block to scratch/pages_block.txt');
    } else {
        console.log('Could not find complete block');
    }
} catch (e) {
    console.error(e);
}
