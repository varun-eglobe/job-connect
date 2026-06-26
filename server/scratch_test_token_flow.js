const axios = require('axios');
const mysql = require('mysql2/promise');

const BASE_URL = 'http://127.0.0.1:5002';

async function test() {
  console.log("--- Starting Token Allocation Verification Test ---");

  // Connect to DB and clean applications for job 1 to start fresh
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'jobconnect_db'
  });
  
  // Let's find an active candidate
  const [candidates] = await db.query("SELECT id, name, phone FROM users WHERE role = 'candidate' LIMIT 1");
  if (candidates.length === 0) {
    console.error("✗ No candidates in database. Seed candidate user first.");
    process.exit(1);
  }
  
  const candidate = candidates[0];
  console.log(`✓ Using candidate for test: ${candidate.name} (ID: ${candidate.id})`);

  // 1. Fetch active jobs to find our Sales Associate job
  let jobs = [];
  try {
    const res = await axios.get(`${BASE_URL}/api/jobs`);
    jobs = res.data.jobs;
    console.log("✓ Successfully fetched active jobs. Total found:", jobs.length);
  } catch (err) {
    console.error("✗ Failed to fetch jobs. Is server running on port 5002?", err.message);
    return;
  }

  const tokenJob = jobs.find(j => j.is_token_based === 1 || j.title === 'Sales Associate');
  if (!tokenJob) {
    console.error("✗ Could not find any token-based job or Sales Associate. Run scratch_seed_token_job.js first.");
    return;
  }

  console.log(`✓ Found Token-based Job: "${tokenJob.title}" (ID: ${tokenJob.id})`);

  console.log(`Cleaning up applications for Job ${tokenJob.id} to start with clean slate...`);
  await db.query('DELETE FROM applications WHERE job_id = ?', [tokenJob.id]);

  // 2. Apply to the job
  console.log(`Applying for job ${tokenJob.id} as candidate ${candidate.id}...`);
  try {
    const applyRes = await axios.post(`${BASE_URL}/api/jobs/${tokenJob.id}/apply`, {
      candidate_id: candidate.id,
      candidate_name: "Test Candidate Proxy Name", // Test proxy apply
      candidate_phone: "9999988888" // Test proxy phone
    });
    
    console.log("✓ Application submission response:", applyRes.data);
    if (applyRes.data.success) {
      console.log(`✓ SECURED TOKEN: #${applyRes.data.token_number}`);
      console.log(`  Date: ${applyRes.data.token_slot_date}`);
      console.log(`  Time Slot: ${applyRes.data.token_slot_time}`);
    } else {
      console.log("✗ Secure token allocation failed.");
    }
  } catch (err) {
    console.error("✗ Application error:", err.response?.data || err.message);
  }

  // 3. Try to apply again (should fail with already applied)
  console.log(`Applying again for job ${tokenJob.id} as candidate ${candidate.id} (expecting already applied error)...`);
  try {
    await axios.post(`${BASE_URL}/api/jobs/${tokenJob.id}/apply`, {
      candidate_id: candidate.id,
      candidate_name: candidate.name,
      candidate_phone: candidate.phone
    });
    console.log("✗ Error: Second application succeeded but should have failed.");
  } catch (err) {
    if (err.response?.data?.already_applied) {
      console.log("✓ Correctly prevented duplicate application:", err.response.data.error);
    } else {
      console.log("✗ Unexpected error on duplicate application:", err.response?.data || err.message);
    }
  }

  // 4. Fetch candidate's dashboard applications
  console.log(`Fetching candidate applications for ID ${candidate.id}...`);
  try {
    const candAppRes = await axios.get(`${BASE_URL}/api/candidates/${candidate.id}/applications`);
    console.log("✓ Candidate applications feed:", candAppRes.data);
  } catch (err) {
    console.error("✗ Failed to fetch candidate applications:", err.message);
  }

  // 5. Fetch employer's applications for the job
  console.log(`Fetching employer applications list for job ${tokenJob.id}...`);
  try {
    const empAppRes = await axios.get(`${BASE_URL}/api/jobs/${tokenJob.id}/applications`);
    console.log("✓ Employer applicants lookup:", empAppRes.data);
  } catch (err) {
    console.error("✗ Failed to fetch employer applicants list:", err.message);
  }

  process.exit();
}

test();
