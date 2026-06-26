const mysql = require('mysql2/promise');
const axios = require('axios');

async function run() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'jobconnect_db'
  });

  const slots = [
    {rangeText: "Token 1-10", startNumber: 1, endNumber: 10, date: "2026-06-23", startTime: "10:00", endTime: "17:00"},
    {rangeText: "Token 11-20", startNumber: 11, endNumber: 20, date: "2026-07-01", startTime: "10:00", endTime: "17:00"}
  ];

  console.log("Updating database to past date for slot 1...");
  await db.query('UPDATE jobs SET token_slots = ? WHERE id = 36', [JSON.stringify(slots)]);

  console.log("Fetching /api/jobs from backend...");
  const res = await axios.get('http://127.0.0.1:5002/api/jobs');
  const job = res.data.jobs.find(j => j.id === 36);
  
  console.log("Job 36 properties:", {
    title: job.title,
    active_remaining_tokens: job.active_remaining_tokens,
    active_total_tokens: job.active_total_tokens,
    applied_count: job.applied_count,
    token_count: job.token_count
  });

  console.log("Restoring database slot 1 date...");
  slots[0].date = "2026-06-29";
  await db.query('UPDATE jobs SET token_slots = ? WHERE id = 36', [JSON.stringify(slots)]);
  console.log("Restored!");

  await db.end();
  process.exit();
}

run().catch(console.error);
