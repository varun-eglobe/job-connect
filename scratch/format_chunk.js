const fs = require('fs');
let code = fs.readFileSync('g:\\\\Varun\\\\Projects\\\\Job Connect\\\\scratch\\\\extracted_chunk.js', 'utf8');

code = code.replace(/;/g, ';\n');
code = code.replace(/\{/g, '{\n');
code = code.replace(/\}/g, '}\n');
fs.writeFileSync('g:\\\\Varun\\\\Projects\\\\Job Connect\\\\scratch\\\\formatted_chunk.js', code, 'utf8');
console.log('Formatted chunk saved!');
