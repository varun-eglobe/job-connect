const axios = require('axios');

async function runTest() {
  console.log('=== STARTING ADMIN FORGOT PASSWORD VERIFICATION ===');
  const API_BASE = 'http://127.0.0.1:5002';

  try {
    // 1. Request Reset OTP
    console.log('\n1. Requesting password reset OTP for admin...');
    const reqRes = await axios.post(`${API_BASE}/api/auth/forgot-password`, {
      role: 'admin',
      identifier: 'admin@jobconnect.gov.in'
    });

    console.log('Response:', reqRes.data);
    if (!reqRes.data.otp_required || !reqRes.data.transaction_token) {
      throw new Error('OTP was not requested successfully.');
    }
    const token = reqRes.data.transaction_token;
    console.log('✓ OTP request succeeded. Token:', token);

    // 2. Perform Reset
    console.log('\n2. Resetting admin password to "newadmin123" using mock OTP 9999...');
    const resetRes = await axios.post(`${API_BASE}/api/auth/reset-password`, {
      transaction_token: token,
      otp_code: '9999',
      new_password: 'newadmin123'
    });

    console.log('Response:', resetRes.data);
    if (!resetRes.data.success) {
      throw new Error('Password reset failed.');
    }
    console.log('✓ Password reset succeeded.');

    // 3. Test logging in with the new password
    console.log('\n3. Verifying login with the new password...');
    const loginRes = await axios.post(`${API_BASE}/api/auth/admin-login`, {
      identifier: 'admin@jobconnect.gov.in',
      password: 'newadmin123'
    });
    console.log('Response:', loginRes.data);
    console.log('✓ Login validation succeeded.');

    // 4. Restore original password "admin123"
    console.log('\n4. Restoring password to "admin123" for dev compatibility...');
    const restoreOtpRes = await axios.post(`${API_BASE}/api/auth/forgot-password`, {
      role: 'admin',
      identifier: 'admin@jobconnect.gov.in'
    });
    const restoreToken = restoreOtpRes.data.transaction_token;
    
    await axios.post(`${API_BASE}/api/auth/reset-password`, {
      transaction_token: restoreToken,
      otp_code: '9999',
      new_password: 'admin123'
    });
    console.log('✓ Original password restored.');

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY ===');
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runTest();
