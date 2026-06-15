const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });
const db = require('../server/db');

async function run() {
  try {
    const [result] = await db.query(
      "UPDATE users SET dob = '2000-01-01' WHERE role = 'candidate' AND (dob IS NULL OR dob = '')"
    );
    console.log(`Successfully updated ${result.affectedRows} candidate(s) with dummy DOB '2000-01-01'.`);
  } catch (err) {
    console.error('Error updating dummy DOB:', err);
  } finally {
    await db.end();
  }
}

run();
