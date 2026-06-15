const path = require('path');
module.paths.push(path.resolve(__dirname, '../server/node_modules'));
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });
const db = require('../server/db');

async function run() {
  try {
    // Let's first see what jobs we have
    const [jobsBefore] = await db.query("SELECT id, title, age_range FROM jobs");
    console.log(`Total jobs in database: ${jobsBefore.length}`);
    console.log("Current age ranges:", jobsBefore.map(j => ({ id: j.id, title: j.title, age_range: j.age_range })));

    // Update NULL or empty age_range to '18-40'
    const [result] = await db.query(
      "UPDATE jobs SET age_range = '18-40' WHERE age_range IS NULL OR age_range = ''"
    );
    console.log(`Successfully updated ${result.affectedRows} job(s) with dummy age range '18-40'.`);

    const [jobsAfter] = await db.query("SELECT id, title, age_range FROM jobs");
    console.log("Updated age ranges:", jobsAfter.map(j => ({ id: j.id, title: j.title, age_range: j.age_range })));
  } catch (err) {
    console.error('Error updating dummy age range:', err);
  } finally {
    await db.end();
  }
}

run();
