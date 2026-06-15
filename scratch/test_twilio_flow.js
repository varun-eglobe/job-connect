const axios = require('axios');

async function runTests() {
    console.log('--- 1. Fetching Settings ---');
    try {
        const res = await axios.get('http://127.0.0.1:5002/api/settings');
        console.log('Settings keys:', Object.keys(res.data));
        console.log('Twilio Enabled:', res.data.twilio_enabled);
        console.log('Twilio SID:', res.data.twilio_sid);
        console.log('Twilio Phone:', res.data.twilio_phone_number);
    } catch (e) {
        console.error('Fetch settings failed:', e.message);
    }

    console.log('\n--- 2. Updating settings to disable Twilio (mock mode check) ---');
    try {
        const fetchRes = await axios.get('http://127.0.0.1:5002/api/settings');
        const settings = fetchRes.data;
        settings.twilio_enabled = 0;
        settings.twilio_sid = 'AC1234567890';
        settings.twilio_auth_token = 'token123';
        settings.twilio_phone_number = '+123456789';

        const updateRes = await axios.post('http://127.0.0.1:5002/api/branding-config', settings);
        console.log('Update result:', updateRes.data);
    } catch (e) {
        console.error('Update settings failed:', e.message);
    }

    console.log('\n--- 3. Testing login OTP (Twilio disabled) ---');
    try {
        const loginRes = await axios.post('http://127.0.0.1:5002/api/auth/login', {
            identifier: '+9999999999',
            password: 'password'
        });
        console.log('Login OTP Response:', loginRes.data);
    } catch (e) {
        console.error('Login failed:', e.response?.data || e.message);
    }

    console.log('\n--- 4. Updating settings to enable Twilio ---');
    try {
        const fetchRes = await axios.get('http://127.0.0.1:5002/api/settings');
        const settings = fetchRes.data;
        settings.twilio_enabled = 1;

        const updateRes = await axios.post('http://127.0.0.1:5002/api/branding-config', settings);
        console.log('Update result:', updateRes.data);
    } catch (e) {
        console.error('Update settings failed:', e.message);
    }

    console.log('\n--- 5. Testing login OTP (Twilio enabled, should send and fail on invalid credentials but let\'s see what fallback does) ---');
    try {
        const loginRes = await axios.post('http://127.0.0.1:5002/api/auth/login', {
            identifier: '+9999999999',
            password: 'password'
        });
        console.log('Login OTP Response (with Twilio active but dummy credentials, should log sending failure and fallback to 9999):', loginRes.data);
    } catch (e) {
        console.error('Login failed:', e.response?.data || e.message);
    }

    console.log('\n--- 6. Re-disabling Twilio to restore dev mode ---');
    try {
        const fetchRes = await axios.get('http://127.0.0.1:5002/api/settings');
        const settings = fetchRes.data;
        settings.twilio_enabled = 0;
        await axios.post('http://127.0.0.1:5002/api/branding-config', settings);
        console.log('Restored Twilio to disabled.');
    } catch (e) {
        console.error('Restore failed:', e.message);
    }
}

runTests();
