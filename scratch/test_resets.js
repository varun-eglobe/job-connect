const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../server/.env' });
const axios = require('axios');

async function test() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'jobconnect_db'
        });

        const [users] = await db.query('SELECT id, name, email, phone, role, password FROM users');
        console.log("Registered Users in DB:", users);

        const candidate = users.find(u => u.role === 'candidate');
        const employer = users.find(u => u.role === 'employer');

        console.log("\nTesting Forgot Password Endpoints via Axios (PORT 5002)...");
        const baseURL = 'http://127.0.0.1:5002';

        if (candidate) {
            console.log(`\n1. Requesting password reset for Candidate phone: ${candidate.phone}`);
            const res1 = await axios.post(`${baseURL}/api/auth/forgot-password`, {
                role: 'candidate',
                identifier: candidate.phone
            });
            console.log("Response:", res1.data);

            const token = res1.data.transaction_token;
            console.log(`\n2. Performing password reset for Candidate with OTP 9999`);
            const res2 = await axios.post(`${baseURL}/api/auth/reset-password`, {
                transaction_token: token,
                otp_code: '9999',
                new_password: 'newcandidatepass123'
            });
            console.log("Response:", res2.data);

            const [updatedCandidate] = await db.query('SELECT password FROM users WHERE id = ?', [candidate.id]);
            console.log("Candidate Password in DB now:", updatedCandidate[0].password);
            
            // Revert candidate password
            await db.execute('UPDATE users SET password = ? WHERE id = ?', [candidate.password, candidate.id]);
            console.log("Restored Candidate original password.");
        } else {
            console.log("No candidate found in DB to test with.");
        }

        if (employer) {
            console.log(`\n3. Requesting password reset for Employer phone: ${employer.phone}`);
            const res3 = await axios.post(`${baseURL}/api/auth/forgot-password`, {
                role: 'employer',
                identifier: employer.phone
            });
            console.log("Response:", res3.data);

            const tokenEmp = res3.data.transaction_token;
            console.log(`\n4. Performing password reset for Employer with OTP 9999`);
            const res4 = await axios.post(`${baseURL}/api/auth/reset-password`, {
                transaction_token: tokenEmp,
                otp_code: '9999',
                new_password: 'newemployerpass123'
            });
            console.log("Response:", res4.data);

            const [updatedEmployer] = await db.query('SELECT password FROM users WHERE id = ?', [employer.id]);
            console.log("Employer Password in DB now:", updatedEmployer[0].password);

            // Revert employer password
            await db.execute('UPDATE users SET password = ? WHERE id = ?', [employer.password, employer.id]);
            console.log("Restored Employer original password.");

            // Test employer email reset
            if (employer.email) {
                console.log(`\n5. Requesting password reset for Employer email: ${employer.email}`);
                const res5 = await axios.post(`${baseURL}/api/auth/forgot-password`, {
                    role: 'employer',
                    identifier: employer.email
                });
                console.log("Response:", res5.data);
            }
        } else {
            console.log("No employer found in DB to test with.");
        }

        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err.response?.data || err.message);
        process.exit(1);
    }
}

test();
