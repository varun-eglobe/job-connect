const fs = require('fs');
const edits = JSON.parse(fs.readFileSync('g:\\\\Varun\\\\Projects\\\\Job Connect\\\\scratch\\\\all_dashboard_edits.json', 'utf8'));

const stepsToPrint = [393, 425, 514, 642, 646, 652, 682, 698, 714, 732, 736, 764, 768, 776, 790];

let out = '';
for (const step of stepsToPrint) {
  const e = edits.find(edit => edit.step === step);
  if (e) {
    out += '=========================================\n';
    out += 'Step ' + e.step + ': ' + e.description + '\n';
    out += 'Lines: ' + e.startLine + '-' + e.endLine + '\n';
    out += '----------------- Target -----------------\n';
    out += e.target + '\n';
    out += '--------------- Replacement ---------------\n';
    out += e.replacement + '\n\n';
  }
}

fs.writeFileSync('g:\\\\Varun\\\\Projects\\\\Job Connect\\\\scratch\\\\major_replacements.txt', out, 'utf8');
console.log('Saved to scratch/major_replacements.txt');
