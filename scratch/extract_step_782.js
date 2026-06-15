const fs = require('fs');
const content = fs.readFileSync('C:\\\\Users\\\\user\\\\.gemini\\\\antigravity-ide\\\\brain\\\\5b4cfb96-1b68-4dcd-bb0e-696d8d7000f4\\\\.system_generated\\\\logs\\\\transcript.jsonl', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"step_index":782') || lines[i].includes('"step_index":783') || lines[i].includes('"step_index":781') || lines[i].includes('"step_index":784')) {
    console.log(`Line ${i+1}:`);
    console.log(lines[i].substring(0, 2000));
  }
}
