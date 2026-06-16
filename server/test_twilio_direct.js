const db = require('./db');
const axios = require('axios');

async function testNumbers() {
    try {
        const [settings] = await db.query('SELECT twilio_sid, twilio_auth_token, twilio_phone_number, twilio_enabled FROM site_settings WHERE id = 1');
        const config = settings && settings[0];
        
        const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilio_sid}/IncomingPhoneNumbers.json`;
        const auth = Buffer.from(`${config.twilio_sid}:${config.twilio_auth_token}`).toString('base64');

        console.log('Fetching incoming phone numbers from Twilio account...');
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        console.log('Incoming Phone Numbers count:', response.data.incoming_phone_numbers.length);
        response.data.incoming_phone_numbers.forEach(num => {
            console.log(`- Phone Number: ${num.phone_number} (Friendly Name: ${num.friendly_name})`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Failed to fetch phone numbers!');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('Error:', err.message);
        }
        process.exit(1);
    }
}

testNumbers();
