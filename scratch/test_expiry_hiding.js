const mysql = require('mysql2/promise');
const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5002';

function getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTomorrowString() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function run() {
    console.log("--- Expiry Hiding Verification Test ---");
    const db = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'jobconnect_db'
    });

    const todayStr = getTodayString();
    const tomorrowStr = getTomorrowString();
    
    console.log(`Today is: ${todayStr}`);
    console.log(`Tomorrow is: ${tomorrowStr}`);

    // Let's find/create a test token-based job
    // We will target job id 36 (or find an active job, we can set is_token_based = 1 on job 1)
    const [jobs] = await db.query("SELECT id, title, is_token_based, expiry_date FROM jobs WHERE status = 'active' LIMIT 1");
    if (jobs.length === 0) {
        console.error("✗ No active jobs found to test.");
        await db.end();
        process.exit(1);
    }

    const testJob = jobs[0];
    const originalIsTokenBased = testJob.is_token_based;
    const originalExpiryDate = testJob.expiry_date;
    const jobId = testJob.id;

    console.log(`Using Job ID: ${jobId} ("${testJob.title}") for verification.`);

    try {
        // --- CASE 1: Token-based job expiring TODAY ---
        console.log("\nSetting job as token-based with expiry date = today...");
        await db.query("UPDATE jobs SET is_token_based = 1, expiry_date = ? WHERE id = ?", [todayStr, jobId]);

        console.log("Fetching jobs list from backend...");
        const resListToday = await axios.get(`${BASE_URL}/api/jobs`);
        const foundToday = resListToday.data.jobs.find(j => j.id === jobId);
        if (!foundToday) {
            console.log("✓ SUCCESS: Job was hidden from listing when expiry_date = today.");
        } else {
            console.log("✗ FAILURE: Job was still visible in listing when expiry_date = today.");
        }

        console.log("Fetching job details directly from backend...");
        try {
            await axios.get(`${BASE_URL}/api/jobs/${jobId}`);
            console.log("✗ FAILURE: Direct job details access succeeded but should have failed (404).");
        } catch (err) {
            if (err.response && err.response.status === 404) {
                console.log("✓ SUCCESS: Direct job details access returned 404.");
            } else {
                console.log("✗ FAILURE: Direct access failed with unexpected error:", err.message);
            }
        }

        // --- CASE 2: Token-based job expiring TOMORROW ---
        console.log("\nSetting job as token-based with expiry date = tomorrow...");
        await db.query("UPDATE jobs SET is_token_based = 1, expiry_date = ? WHERE id = ?", [tomorrowStr, jobId]);

        console.log("Fetching jobs list from backend...");
        const resListTomorrow = await axios.get(`${BASE_URL}/api/jobs`);
        const foundTomorrow = resListTomorrow.data.jobs.find(j => j.id === jobId);
        if (foundTomorrow) {
            console.log("✓ SUCCESS: Job is visible in listing when expiry_date = tomorrow.");
        } else {
            console.log("✗ FAILURE: Job was hidden from listing when expiry_date = tomorrow.");
        }

        console.log("Fetching job details directly from backend...");
        try {
            const resDetailTomorrow = await axios.get(`${BASE_URL}/api/jobs/${jobId}`);
            if (resDetailTomorrow.data.job && resDetailTomorrow.data.job.id === jobId) {
                console.log("✓ SUCCESS: Direct job details access succeeded and returned correct job.");
            } else {
                console.log("✗ FAILURE: Direct details response did not match job ID.");
            }
        } catch (err) {
            console.log("✗ FAILURE: Direct access failed:", err.message);
        }

    } catch (error) {
        console.error("An error occurred during verification:", error.message);
    } finally {
        // Restore original values
        console.log("\nRestoring original job properties...");
        const formattedOrigDate = originalExpiryDate ? new Date(originalExpiryDate).toISOString().slice(0, 10) : null;
        await db.query("UPDATE jobs SET is_token_based = ?, expiry_date = ? WHERE id = ?", [originalIsTokenBased, formattedOrigDate, jobId]);
        console.log("✓ Restored!");
        await db.end();
    }
}

run();
