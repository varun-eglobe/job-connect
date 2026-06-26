const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../server/.env' });

async function verify() {
  const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'job_connect',
  });

  try {
    console.log("Fetching candidates...");
    const [candidates] = await db.query(
      'SELECT id, name, dob, role FROM users WHERE role = "candidate" AND dob IS NOT NULL LIMIT 5'
    );
    console.log("Found candidates:", candidates.map(c => ({ id: c.id, name: c.name, dob: c.dob })));

    console.log("\nFetching token-based jobs...");
    const [jobs] = await db.query(
      'SELECT id, title, age_range, is_token_based FROM jobs WHERE is_token_based = 1 AND status = "active" LIMIT 5'
    );
    console.log("Found jobs:", jobs.map(j => ({ id: j.id, title: j.title, age_range: j.age_range })));

    if (candidates.length === 0 || jobs.length === 0) {
      console.log("No candidates or jobs found to test with.");
      return;
    }

    const candidate = candidates[0];
    const dob = new Date(candidate.dob);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    console.log(`\nTesting with Candidate: ${candidate.name} (Age: ${age}, DOB: ${candidate.dob})`);

    // Let's call the API /api/jobs and pass candidate_id
    const response = await axios.get(`http://localhost:5002/api/jobs?candidate_id=${candidate.id}`);
    console.log(`\nAPI GET /api/jobs?candidate_id=${candidate.id} results:`);
    response.data.jobs.forEach(job => {
      console.log(`- Job ID ${job.id}: "${job.title}" | Age Range: "${job.age_range}" | is_age_eligible: ${job.is_age_eligible}`);
    });

    // Let's call /api/jobs/:id for each job
    console.log(`\nAPI GET /api/jobs/:id?candidate_id=${candidate.id} individual checks:`);
    for (const job of response.data.jobs.slice(0, 3)) {
      const detailRes = await axios.get(`http://localhost:5002/api/jobs/${job.id}?candidate_id=${candidate.id}`);
      const j = detailRes.data.job;
      console.log(`- Job ID ${j.id}: "${j.title}" | Age Range: "${j.age_range}" | is_age_eligible: ${j.is_age_eligible}`);
    }

  } catch (err) {
    console.error("Error during verification:", err.message);
    if (err.response) {
      console.error("API response error:", err.response.data);
    }
  } finally {
    await db.end();
  }
}

verify();
