const mysql = require('mysql2/promise');
const axios = require('axios');

async function run() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'jobconnect_db'
  });

  // Today is 2026-06-24. Current time is around 12:00 (midday).
  // We configure:
  // Slot 1: Date is today (2026-06-24), endTime is 11:00 AM (already in the past)
  // Slot 2: Date is today (2026-06-24), endTime is 23:00 (11 PM, in the future)
  const todayStr = '2026-06-24';
  
  const slots = [
    {rangeText: "Token 1-10", startNumber: 1, endNumber: 10, date: todayStr, startTime: "10:00", endTime: "11:00"},
    {rangeText: "Token 11-20", startNumber: 11, endNumber: 20, date: todayStr, startTime: "12:00", endTime: "23:00"}
  ];

  console.log("Configuring slots for Job 36 where Slot 1 is in the past by time, and Slot 2 is active...");
  await db.query('UPDATE jobs SET token_slots = ? WHERE id = 36', [JSON.stringify(slots)]);

  // Clear existing applications for Job 36 except one to match user description (1 application on token 1)
  console.log("Setting up applications table for Job 36...");
  await db.query('DELETE FROM applications WHERE job_id = 36');
  // Add 1 application with token 1 (matching slot 1)
  await db.query('INSERT INTO applications (job_id, candidate_id, token_number, token_slot_date, token_slot_time, status) VALUES (36, 7, 1, ?, "10:00 - 11:00", "applied")', [todayStr]);

  console.log("Fetching /api/jobs/36 (details) from backend...");
  const detailRes = await axios.get('http://127.0.0.1:5002/api/jobs/36');
  const detailJob = detailRes.data.job;

  console.log("Job Detail active tokens:", {
    title: detailJob.title,
    active_remaining_tokens: detailJob.active_remaining_tokens,
    active_total_tokens: detailJob.active_total_tokens
  });

  console.log("Simulating applying to Job 36 (should get token from Slot 2)...");
  try {
    const applyRes = await axios.post('http://127.0.0.1:5002/api/jobs/36/apply', {
      candidate_id: 38, // different candidate
      answers: []
    });
    console.log("Apply response:", {
      success: applyRes.data.success,
      applicationId: applyRes.data.applicationId,
      tokenNumber: applyRes.data.tokenNumber,
      tokenSlotDate: applyRes.data.tokenSlotDate,
      tokenSlotTime: applyRes.data.tokenSlotTime
    });
  } catch (err) {
    console.error("Apply failed:", err.response?.data || err.message);
  }

  // Restore Slot 1 original values
  console.log("Restoring original slots for Job 36...");
  const originalSlots = [
    {rangeText: "Token 1-10", startNumber: 1, endNumber: 10, date: "2026-06-29", startTime: "10:00", endTime: "17:00"},
    {rangeText: "Token 11-20", startNumber: 11, endNumber: 20, date: "2026-07-01", startTime: "10:00", endTime: "17:00"}
  ];
  await db.query('UPDATE jobs SET token_slots = ? WHERE id = 36', [JSON.stringify(originalSlots)]);
  await db.query('DELETE FROM applications WHERE job_id = 36 AND candidate_id = 38');
  await db.query('UPDATE applications SET token_number = 1, token_slot_date = "2026-06-29", token_slot_time = "10:00 - 17:00" WHERE job_id = 36 AND candidate_id = 7');
  console.log("Restored!");

  await db.end();
  process.exit();
}

run().catch(console.error);
