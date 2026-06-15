const fs = require('fs');
const content = fs.readFileSync('C:\\\\Users\\\\user\\\\.gemini\\\\antigravity-ide\\\\brain\\\\5b4cfb96-1b68-4dcd-bb0e-696d8d7000f4\\\\.system_generated\\\\logs\\\\transcript.jsonl', 'utf8');

const lines = content.split('\n');
const edits = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  if (line.includes('EmployerDashboard.jsx') && (line.includes('replace_file_content') || line.includes('write_to_file'))) {
    const argsIndex = line.indexOf('"args":');
    if (argsIndex === -1) continue;
    
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
      edits.push({
        step: i + 1,
        description: parsed.Description || parsed.description,
        startLine: parsed.StartLine || parsed.startLine,
        endLine: parsed.EndLine || parsed.endLine,
        target: parsed.TargetContent || parsed.targetContent,
        replacement: parsed.ReplacementContent || parsed.replacementContent
      });
    } catch (err) {
      // ignore parse errors
    }
  }
}
fs.writeFileSync('g:\\\\Varun\\\\Projects\\\\Job Connect\\\\scratch\\\\all_dashboard_edits.json', JSON.stringify(edits, null, 2), 'utf8');
console.log('Saved ' + edits.length + ' edits to scratch/all_dashboard_edits.json');
