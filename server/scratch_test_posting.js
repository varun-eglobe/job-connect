const axios = require('axios');
const db = require('./db');

async function test() {
    const baseUrl = 'http://127.0.0.1:5002/api';
    console.log("=== START VERIFICATION TEST ===");

    // 1. Fetch current settings
    console.log("1. Fetching settings...");
    const getSettingsRes = await axios.get(`${baseUrl}/settings`);
    console.log("Current job prefix:", getSettingsRes.data.job_id_prefix);

    // 2. Update settings prefix to 'TJC'
    console.log("2. Updating prefix to 'TJC'...");
    const updatedSettings = {
        ...getSettingsRes.data,
        job_id_prefix: 'TJC'
    };
    await axios.post(`${baseUrl}/branding-config`, updatedSettings);
    
    // Confirm prefix update
    const getSettingsRes2 = await axios.get(`${baseUrl}/settings`);
    console.log("New job prefix confirmed:", getSettingsRes2.data.job_id_prefix);
    if (getSettingsRes2.data.job_id_prefix !== 'TJC') {
        throw new Error("Prefix update failed!");
    }

    // 3. Post a job with employer_id = 34
    console.log("3. Posting a new job under employer 34...");
    const postJobRes = await axios.post(`${baseUrl}/jobs`, {
        employer_id: 34,
        title: 'Test Verification Job',
        description: 'Testing the new Job Post ID configuration functionality.',
        location: 'Pattom',
        job_type: 'Full-time',
        vacancies_count: 2,
        expiry_date: '2026-12-31',
        contact_person: 'Verification Officer',
        contact_phone: '1234567890',
        status: 'active',
        is_urgent: false,
        salary_range: '15,000 - 25,000'
    });
    
    const generatedId = postJobRes.data.job_post_id;
    console.log("Post Job Response:", postJobRes.data);
    console.log("Generated Job Post ID:", generatedId);
    
    if (!generatedId.startsWith('TJC-')) {
        throw new Error(`Job Post ID does not start with TJC! Got: ${generatedId}`);
    }
    console.log("Prefix validation PASSED!");

    // Clean up created job
    console.log("4. Cleaning up test job...");
    await db.query("DELETE FROM jobs WHERE id = ?", [postJobRes.data.id]);
    
    // Revert settings to 'JC'
    console.log("5. Reverting settings prefix to 'JC'...");
    await axios.post(`${baseUrl}/branding-config`, {
        ...getSettingsRes.data,
        job_id_prefix: 'JC'
    });

    console.log("=== ALL VERIFICATION TESTS PASSED ===");
    process.exit(0);
}

test().catch(err => {
    console.error("Verification test failed:", err.message);
    if (err.response) {
        console.error("Response data:", err.response.data);
    }
    process.exit(1);
});
