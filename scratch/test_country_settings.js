const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

const API_BASE = 'http://127.0.0.1:5002/api';

async function runTest() {
    console.log("=== STARTING FUNCTIONAL VERIFICATION ===");
    
    // Connect to database directly for state checking and cleanup
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'jobconnect_db'
    });

    try {
        // 1. Get original settings
        console.log("\n1. Fetching current settings...");
        const origRes = await axios.get(`${API_BASE}/settings`);
        const originalSettings = origRes.data;
        console.log("Current Settings:", {
            currency_code: originalSettings.currency_code,
            country_phone_code: originalSettings.country_phone_code
        });

        // 2. Modify settings to UAE (AED / 971)
        console.log("\n2. Updating branding configuration to UAE (AED / 971)...");
        const updatePayload = {
            ...originalSettings,
            currency_code: 'AED',
            country_phone_code: '971'
        };
        const updateRes = await axios.post(`${API_BASE}/branding-config`, updatePayload);
        console.log("Update API response:", updateRes.data);

        // Verify in database
        const [settingsRows] = await db.query('SELECT currency_code, country_phone_code FROM site_settings WHERE id = 1');
        console.log("Database site_settings row:", settingsRows[0]);
        if (settingsRows[0].currency_code !== 'AED' || settingsRows[0].country_phone_code !== '971') {
            throw new Error("Failed to persist settings in DB!");
        }
        console.log("✓ Settings updated and verified in DB.");

        // 3. Test Registration with UAE phone prefix (+971501234567)
        console.log("\n3. Testing candidate registration with UAE number...");
        // Ensure no conflicting user
        await db.query("DELETE FROM users WHERE phone LIKE '%501234567%'");

        const regPayload = {
            name: "Test UAE Candidate",
            email: "uae_candidate@test.com",
            phone: "+971501234567",
            password: "password123",
            role: "candidate",
            dob: "1995-05-15"
        };
        
        const regRes = await axios.post(`${API_BASE}/auth/register`, regPayload);
        console.log("Registration API Response (Step 1):", regRes.data);
        if (!regRes.data.otp_required || !regRes.data.transaction_token) {
            throw new Error("Registration step 1 did not trigger OTP or return transaction token");
        }

        const transToken = regRes.data.transaction_token;

        // Verify OTP (Dev mode fallback is '9999')
        console.log("Verifying registration OTP (using 9999)...");
        const verifyRes = await axios.post(`${API_BASE}/auth/register/verify-otp`, {
            transaction_token: transToken,
            otp_code: '9999'
        });
        console.log("Registration verify response:", verifyRes.data);
        
        // 4. Verify login dynamically handles prefixes
        console.log("\n4. Testing login lookups with various formats...");

        // Format A: Full format with '+' (+971501234567)
        console.log("Format A: +971501234567");
        const loginResA = await axios.post(`${API_BASE}/auth/login`, {
            identifier: "+971501234567",
            password: "password123"
        });
        console.log("Login A response (otp_required should be true):", loginResA.data);
        if (!loginResA.data.otp_required) {
            throw new Error("Login A did not require OTP");
        }

        // Format B: Full format without '+' (971501234567)
        console.log("Format B: 971501234567");
        const loginResB = await axios.post(`${API_BASE}/auth/login`, {
            identifier: "971501234567",
            password: "password123"
        });
        console.log("Login B response (otp_required should be true):", loginResB.data);
        if (!loginResB.data.otp_required) {
            throw new Error("Login B did not require OTP");
        }

        // Format C: Localized format (501234567)
        console.log("Format C: 501234567");
        const loginResC = await axios.post(`${API_BASE}/auth/login`, {
            identifier: "501234567",
            password: "password123"
        });
        console.log("Login C response (otp_required should be true):", loginResC.data);
        if (!loginResC.data.otp_required) {
            throw new Error("Login C did not require OTP");
        }

        console.log("✓ Dynamic lookup succeeded for all formatted numbers!");

        // 5. Test Payment Simulation Success Message Currency formatting
        console.log("\n5. Testing Payment Success Message dynamic currency...");
        
        // Register an employer mock to make payment
        await db.query("DELETE FROM users WHERE phone LIKE '%509998888%'");
        const empRegPayload = {
            name: "Test UAE Employer",
            email: "uae_employer@test.com",
            phone: "+971509998888",
            password: "password123",
            role: "employer",
            company_name: "UAE Enterprises",
            address: "Dubai",
            gst_number: "" // Empty or optional
        };
        const empRegRes = await axios.post(`${API_BASE}/auth/register`, empRegPayload);
        const empTransToken = empRegRes.data.transaction_token;
        
        // Complete employer registration
        await axios.post(`${API_BASE}/auth/register/verify-otp`, {
            transaction_token: empTransToken,
            otp_code: '9999'
        });

        // Query the newly inserted employer ID
        const [empRows] = await db.query("SELECT id FROM users WHERE email = 'uae_employer@test.com'");
        const empId = empRows[0].id;

        // Perform payment Simulation
        const payRes = await axios.post(`${API_BASE}/employers/payment`, {
            employerId: empId,
            amount: 100
        });
        console.log("Payment Simulation API response:", payRes.data);
        if (!payRes.data.message.includes("AED100")) {
            throw new Error("Payment success message did not contain correct AED currency symbol format!");
        }
        console.log("✓ Payment success message dynamically outputs the configured currency symbol.");

        // Cleanup mock data
        console.log("\nCleaning up mock user records...");
        await db.query("DELETE FROM users WHERE email IN ('uae_candidate@test.com', 'uae_employer@test.com')");
        console.log("✓ Mock users deleted.");

        // Restore original settings
        console.log("\nRestoring original site settings...");
        await axios.post(`${API_BASE}/branding-config`, originalSettings);
        console.log("✓ Site settings successfully restored to original values.");

        console.log("\n=== FUNCTIONAL VERIFICATION COMPLETED SUCCESSFULLY ===");

    } catch (error) {
        console.error("Verification failed with error:", error.response ? error.response.data : error.message);
        
        // Try restoring original settings in case of failure
        try {
            console.log("Attempting emergency restore of site settings...");
            const origRes = await axios.get(`${API_BASE}/settings`);
            // Set back to INR/91 if we can't fetch it, or use default fallback
            const fallbackSettings = {
                ...origRes.data,
                currency_code: 'INR',
                country_phone_code: '91'
            };
            await axios.post(`${API_BASE}/branding-config`, fallbackSettings);
            console.log("✓ Site settings restored to defaults.");
        } catch (e) {
            console.error("Emergency restore failed:", e.message);
        }

        process.exit(1);
    } finally {
        await db.end();
    }
}

runTest();
