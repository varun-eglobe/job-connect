const mysql = require('mysql2/promise');

async function run() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'jobconnect_db'
  });

  console.log("Updating Sales Associate job to be token-based...");
  
  const slots = [
    {index: 0, startNumber: 1, endNumber: 10, date: "2026-06-15", startTime: "10:00", endTime: "13:00"},
    {index: 1, startNumber: 11, endNumber: 20, date: "2026-06-15", startTime: "14:00", endTime: "17:00"},
    {index: 2, startNumber: 21, endNumber: 30, date: "2026-06-16", startTime: "10:00", endTime: "13:00"},
    {index: 3, startNumber: 31, endNumber: 35, date: "2026-06-16", startTime: "14:00", endTime: "16:00"}
  ];

  await db.query(`
    UPDATE jobs 
    SET is_token_based = 1, 
        token_count = 35, 
        token_split = 10, 
        token_slots = ?,
        expiry_date = '2026-06-30'
    WHERE title = 'Sales Associate'
  `, [JSON.stringify(slots)]);

  console.log("Sales Associate is now a token-based job with 35 tokens split in 4 slots.");
  process.exit();
}

run().catch(console.error);
