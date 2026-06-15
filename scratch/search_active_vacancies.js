const fs = require('fs');
const path = require('path');

const assetsDir = 'g:\\\\Varun\\\\Projects\\\\Job Connect\\\\client\\\\dist\\\\assets';
const files = fs.readdirSync(assetsDir);
const mainBundle = files.find(f => f.startsWith('index-') && f.endsWith('.js'));

if (mainBundle) {
  const bundlePath = path.join(assetsDir, mainBundle);
  console.log('Searching main bundle:', bundlePath);
  const content = fs.readFileSync(bundlePath, 'utf8');
  
  const searchStr = 'active vacancies';
  let idx = -1;
  while ((idx = content.toLowerCase().indexOf(searchStr, idx + 1)) !== -1) {
    console.log('Found string "' + searchStr + '" at index:', idx);
    console.log(content.substring(idx - 500, idx + 1500));
  }
}
