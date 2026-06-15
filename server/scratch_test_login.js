const axios = require('axios');

async function run() {
    const baseUrl = 'http://127.0.0.1:5002/api';
    console.log("Testing login for 12345678901 / 123456...");

    try {
        const response = await axios.post(`${baseUrl}/auth/login`, {
            identifier: '12345678901',
            password: '123456'
        });
        console.log("Response:", response.data);
        if (response.data.otp_required) {
            console.log("SUCCESS! Login endpoint correctly processed the credentials and triggered the OTP flow.");
        } else {
            console.log("FAILED! Unexpected response data.");
        }
    } catch (err) {
        console.error("Login request failed!");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

run();
