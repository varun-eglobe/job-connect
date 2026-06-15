const fs = require('fs');
const path = require('path');

const assetsDir = 'g:\\\\Varun\\\\Projects\\\\Job Connect\\\\client\\\\dist\\\\assets';
const files = fs.readdirSync(assetsDir);
const mainBundle = files.find(f => f.startsWith('index-') && f.endsWith('.js'));

if (mainBundle) {
  const bundlePath = path.join(assetsDir, mainBundle);
  console.log('Searching main bundle:', bundlePath);
  const content = fs.readFileSync(bundlePath, 'utf8');
  
  const searchStr = 'listing approval';
  const idx = content.toLowerCase().indexOf(searchStr);
  if (idx !== -1) {
    console.log('Found string "' + searchStr + '" at index:', idx);
    console.log(content.substring(idx - 500, idx + 1500));
  } else {
    console.log('String "' + searchStr + '" NOT found in bundle.');
  }
} else {
  console.log('Main bundle not found.');
}
