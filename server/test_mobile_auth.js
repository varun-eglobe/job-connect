const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5002';

async function runTests() {
    console.log('=== STARTING MOBILE-ONLY AUTH & ADMIN GATEWAY TESTS ===');
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const employerPhone = `9876${randomSuffix}`;
    const candidatePhone = `8765${randomSuffix}`;
    const employerEmail = `testemployer_${randomSuffix}@example.com`;
    const newPassword = 'newsecurepassword123';
    const adminEmail = 'admin@jobconnect.gov.in';
    const adminPassword = 'admin123';

    try {
        let employerId;
        // Test 1: Register Employer with Phone and Email Address
        console.log(`\n[Test 1] Registering Employer with phone: ${employerPhone} and email: ${employerEmail}...`);
        const employerRegResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
            name: 'Test Employer Corp',
            phone: employerPhone,
            email: employerEmail,
            password: 'password123',
            role: 'employer',
            company_name: 'Test Employer Corp',
            address: '123 Tech Park',
            gst_number: '32AAAAA0000A1Z5'
        });
        console.log('Employer registration response:', employerRegResponse.data);
        if (!employerRegResponse.data.otp_required || !employerRegResponse.data.transaction_token) {
            throw new Error('Employer registration failed to trigger OTP flow.');
        }

        console.log('Verifying Employer registration OTP...');
        const employerVerifyResponse = await axios.post(`${BASE_URL}/api/auth/register/verify-otp`, {
            transaction_token: employerRegResponse.data.transaction_token,
            otp_code: '9999'
        });
        console.log('Employer OTP Verification response:', employerVerifyResponse.data);
        if (employerVerifyResponse.data.id) {
            console.log('SUCCESS: Employer registered successfully via OTP!');
            employerId = employerVerifyResponse.data.id;
        } else {
            throw new Error('Employer registration verification failed, did not return user ID.');
        }

        // Test 2: Register Candidate with Mobile
        console.log(`\n[Test 2] Registering Candidate with phone: ${candidatePhone}...`);
        const candidateRegResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
            name: 'John Candidate',
            phone: candidatePhone,
            password: 'password123',
            role: 'candidate'
        });
        console.log('Candidate registration response:', candidateRegResponse.data);
        if (!candidateRegResponse.data.otp_required || !candidateRegResponse.data.transaction_token) {
            throw new Error('Candidate registration failed to trigger OTP flow.');
        }

        console.log('Verifying Candidate registration OTP...');
        const candidateVerifyResponse = await axios.post(`${BASE_URL}/api/auth/register/verify-otp`, {
            transaction_token: candidateRegResponse.data.transaction_token,
            otp_code: '9999'
        });
        console.log('Candidate OTP Verification response:', candidateVerifyResponse.data);
        if (candidateVerifyResponse.data.id) {
            console.log('SUCCESS: Candidate registered successfully via OTP!');
        } else {
            throw new Error('Candidate registration verification failed, did not return user ID.');
        }

        // Test 3: Log in as Employer with Mobile Number
        console.log(`\n[Test 3] Logging in as Employer with phone: ${employerPhone}...`);
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            identifier: employerPhone,
            password: 'password123'
        });
        console.log('Login response:', loginResponse.data);
        if (!loginResponse.data.otp_required || !loginResponse.data.transaction_token) {
            throw new Error('Login failed to trigger OTP flow or return transaction token.');
        }
        console.log('SUCCESS: Login triggered OTP flow!');

        // Test 4: Verify OTP for Employer Login
        const transactionToken = loginResponse.data.transaction_token;
        console.log(`\n[Test 4] Verifying OTP 9999 for Employer login...`);
        const verifyResponse = await axios.post(`${BASE_URL}/api/auth/login/verify-otp`, {
            transaction_token: transactionToken,
            otp_code: '9999'
        });
        console.log('OTP Verification Response User:', verifyResponse.data.user);
        if (verifyResponse.data.user && verifyResponse.data.user.role === 'employer') {
            console.log('SUCCESS: OTP login verification completed successfully!');
        } else {
            throw new Error('OTP verification did not return the expected user details.');
        }

        // Test 5: Forgot Password for Employer using strictly Mobile Number
        console.log(`\n[Test 5] Requesting Forgot Password OTP for Employer using phone: ${employerPhone}...`);
        const forgotResponse = await axios.post(`${BASE_URL}/api/auth/forgot-password`, {
            role: 'employer',
            identifier: employerPhone
        });
        console.log('Forgot Password response:', forgotResponse.data);
        if (!forgotResponse.data.otp_required || !forgotResponse.data.transaction_token) {
            throw new Error('Forgot password request failed to trigger OTP flow.');
        }
        console.log('SUCCESS: Forgot password OTP flow triggered!');

        // Test 6: Reset Password using OTP 9999
        const resetToken = forgotResponse.data.transaction_token;
        console.log(`\n[Test 6] Resetting password to "${newPassword}"...`);
        const resetResponse = await axios.post(`${BASE_URL}/api/auth/reset-password`, {
            transaction_token: resetToken,
            otp_code: '9999',
            new_password: newPassword
        });
        console.log('Reset Password response:', resetResponse.data);
        if (!resetResponse.data.success) {
            throw new Error('Password reset failed.');
        }
        console.log('SUCCESS: Password reset successfully!');

        // Test 7: Log in with new password
        console.log(`\n[Test 7] Logging in as Employer with new password...`);
        const newLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            identifier: employerPhone,
            password: newPassword
        });
        console.log('New login OTP flow response:', newLoginResponse.data);
        if (newLoginResponse.data.otp_required) {
            console.log('SUCCESS: Logged in successfully with the new password!');
        } else {
            throw new Error('Failed to log in with new password.');
        }

        // Test 8: Log in using email for Employer (should fail with 403)
        console.log(`\n[Test 8] Attempting email login for Employer (${employerEmail}) (should be rejected)...`);
        try {
            await axios.post(`${BASE_URL}/api/auth/login`, {
                identifier: employerEmail,
                password: newPassword
            });
            throw new Error('Email login succeeded for employer but should have been blocked!');
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log('SUCCESS: Email login rejected with status 403:', err.response.data.error);
            } else {
                throw err;
            }
        }

        // Test 9: Attempt Admin login on standard user login endpoint (should fail with 403)
        console.log(`\n[Test 9] Attempting Admin login on standard user login endpoint (should be rejected)...`);
        try {
            await axios.post(`${BASE_URL}/api/auth/login`, {
                identifier: adminEmail,
                password: adminPassword
            });
            throw new Error('Admin login succeeded on standard endpoint but should have been blocked!');
        } catch (err) {
            if (err.response && err.response.status === 401) {
                console.log('SUCCESS: Admin standard endpoint login rejected with status 401:', err.response.data.error);
            } else {
                throw err;
            }
        }

        // Test 10: Attempt Employer login on secure admin portal endpoint (should fail with 401)
        console.log(`\n[Test 10] Attempting Employer login on secure admin portal endpoint (should be rejected)...`);
        try {
            await axios.post(`${BASE_URL}/api/auth/admin-login`, {
                identifier: employerEmail,
                password: newPassword
            });
            throw new Error('Employer login succeeded on admin endpoint but should have been blocked!');
        } catch (err) {
            if (err.response && err.response.status === 401) {
                console.log('SUCCESS: Employer admin-endpoint login rejected with status 401:', err.response.data.error);
            } else {
                throw err;
            }
        }

        // Test 11: Attempt Admin login on secure admin portal endpoint (should succeed and trigger OTP flow)
        console.log(`\n[Test 11] Attempting Admin login on secure admin portal endpoint...`);
        const adminLoginResponse = await axios.post(`${BASE_URL}/api/auth/admin-login`, {
            identifier: adminEmail,
            password: adminPassword
        });
        console.log('Admin login response:', adminLoginResponse.data);
        if (adminLoginResponse.data.otp_required) {
            console.log('SUCCESS: Admin logged in successfully on secure admin gateway!');
        } else {
            throw new Error('Admin secure gateway login failed to trigger OTP flow.');
        }

        // Test 12: Delete the registered pending employer (should succeed)
        console.log(`\n[Test 12] Deleting pending employer registration (ID: ${employerId})...`);
        const deleteResponse = await axios.delete(`${BASE_URL}/api/admin/employers/${employerId}`);
        console.log('Delete response:', deleteResponse.data);
        if (deleteResponse.data.success) {
            console.log('SUCCESS: Pending employer deleted successfully!');
        } else {
            throw new Error('Failed to delete pending employer.');
        }

        console.log('\n=== ALL TESTS PASSED SUCCESSFULLY ===');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ TEST FAILED:', err.response?.data || err.message);
        process.exit(1);
    }
}

runTests();
