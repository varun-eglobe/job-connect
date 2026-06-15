const fs = require('fs');
const content = fs.readFileSync('C:\\\\Users\\\\user\\\\.gemini\\\\antigravity-ide\\\\brain\\\\5b4cfb96-1b68-4dcd-bb0e-696d8d7000f4\\\\.system_generated\\\\logs\\\\transcript.jsonl', 'utf8');

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  if (line.includes('EmployerDashboard.jsx') && (line.includes('replace_file_content') || line.includes('write_to_file'))) {
    // Let's locate the "args" part
    const argsIndex = line.indexOf('"args":');
    if (argsIndex !== -1) {
      let braceCount = 0;
      let inString = false;
      let argsStr = '';
      for (let j = argsIndex + 7; j < line.length; j++) {
        const char = line[j];
        argsStr += char;
        if (char === '"' && line[j-1] !== '\\') {
          inString = !inString;
        }
        if (!inString) {
          if (char === '{') braceCount++;
          if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              break;
            }
          }
        }
      }
      
      try {
        // Escape literal newlines within strings
        // In valid JSON, all literal newlines inside strings must be escaped as \n.
        // But since this is a broken transcript, let's fix it:
        let sanitized = '';
        let insideStr = false;
        for (let k = 0; k < argsStr.length; k++) {
          const c = argsStr[k];
          if (c === '"' && argsStr[k-1] !== '\\') {
            insideStr = !insideStr;
            sanitized += c;
          } else if (insideStr && (c === '\n' || c === '\r')) {
            if (c === '\n') sanitized += '\\n';
          } else {
            sanitized += c;
          }
        }
        const parsed = JSON.parse(sanitized);
        console.log('=== Step ' + (i+1) + ': ' + parsed.Description + ' (Lines: ' + parsed.StartLine + '-' + parsed.EndLine + ') ===');
        console.log('--- Target ---');
        console.log(parsed.TargetContent);
        console.log('--- Replacement ---');
        console.log(parsed.ReplacementContent);
        console.log('\n');
      } catch (err) {
        console.log('--- Step ' + (i+1) + ' Failed to parse args: ' + err.message);
        console.log(argsStr.substring(0, 500) + '...\n');
      }
    }
  }
}
