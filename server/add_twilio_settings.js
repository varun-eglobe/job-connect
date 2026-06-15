const db = require('./db');

async function run() {
    console.log('Starting migration to add Twilio settings to site_settings table...');
    try {
        await db.query('ALTER TABLE site_settings ADD COLUMN twilio_sid VARCHAR(255) DEFAULT NULL');
        console.log('Added twilio_sid column successfully.');
    } catch (e) {
        console.log('Note (twilio_sid):', e.message);
    }
    try {
        await db.query('ALTER TABLE site_settings ADD COLUMN twilio_auth_token VARCHAR(255) DEFAULT NULL');
        console.log('Added twilio_auth_token column successfully.');
    } catch (e) {
        console.log('Note (twilio_auth_token):', e.message);
    }
    try {
        await db.query('ALTER TABLE site_settings ADD COLUMN twilio_phone_number VARCHAR(50) DEFAULT NULL');
        console.log('Added twilio_phone_number column successfully.');
    } catch (e) {
        console.log('Note (twilio_phone_number):', e.message);
    }
    try {
        await db.query('ALTER TABLE site_settings ADD COLUMN twilio_enabled TINYINT(1) DEFAULT 0');
        console.log('Added twilio_enabled column successfully.');
    } catch (e) {
        console.log('Note (twilio_enabled):', e.message);
    }
    console.log('Migration finished.');
    process.exit(0);
}

run();
