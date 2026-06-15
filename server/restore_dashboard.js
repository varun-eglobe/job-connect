const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\5b4cfb96-1b68-4dcd-bb0e-696d8d7000f4\\.system_generated\\logs\\transcript.jsonl';
const targetPath = 'g:\\Varun\\Projects\\Job Connect\\client\\src\\pages\\EmployerDashboard.jsx';

async function restore() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let foundContent = null;
  for await (const line of rl) {
    const data = JSON.parse(line);
    // Find the step where the full file content of EmployerDashboard.jsx was outputted
    if (data.step_index === 327 && data.content && data.content.includes("File Path: `file:///g:/Varun/Projects/Job%20Connect/client/src/pages/EmployerDashboard.jsx`")) {
      const contentParts = data.content.split('\n');
      // The content parts have line numbers like "1: import React...", we need to strip them.
      const lines = [];
      let startLine = false;
      for (const p of contentParts) {
        if (p.startsWith("The following code has been modified")) {
          startLine = true;
          continue;
        }
        if (startLine && p.trim()) {
          const match = p.match(/^\d+:\s?(.*)/);
          if (match) {
            lines.push(match[1]);
          } else if (p.startsWith("Showing lines") || p.startsWith("Total Lines")) {
             // meta lines
          } else {
            lines.push(p);
          }
        }
      }
      foundContent = lines.join('\n');
      break;
    }
  }

  if (foundContent) {
    // Clean up content: the parsed string might contain windows line endings or trailing text
    // Remove the trailing summary line like "The above content shows the entire..."
    const cleanLines = foundContent.split('\n').filter(line => !line.startsWith("The above content shows the entire"));
    fs.writeFileSync(targetPath, cleanLines.join('\n').trim(), 'utf8');
    console.log('EmployerDashboard.jsx successfully restored!');
  } else {
    console.log('Could not find Step 327 content in transcript.jsonl');
  }
}

restore();
