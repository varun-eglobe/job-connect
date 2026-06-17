const db = require('./db');

async function run() {
    console.log('Starting migration to add SMTP settings to site_settings table...');
    try {
        await db.query('ALTER TABLE site_settings ADD COLUMN smtp_host VARCHAR(255) DEFAULT NULL');
        console.log('Added smtp_host column successfully.');
    } catch (e) {
        console.log('Note (smtp_host):', e.message);
    }
    try {
        await db.query('ALTER TABLE site_settings ADD COLUMN smtp_port INT DEFAULT NULL');
        console.log('Added smtp_port column successfully.');
    } catch (e) {
        console.log('Note (smtp_port):', e.message);
    }
    try {
        await db.query('ALTER TABLE site_settings ADD COLUMN smtp_user VARCHAR(255) DEFAULT NULL');
        console.log('Added smtp_user column successfully.');
    } catch (e) {
        console.log('Note (smtp_user):', e.message);
    }
    try {
        await db.query('ALTER TABLE site_settings ADD COLUMN smtp_pass VARCHAR(255) DEFAULT NULL');
        console.log('Added smtp_pass column successfully.');
    } catch (e) {
        console.log('Note (smtp_pass):', e.message);
    }
    try {
        await db.query('ALTER TABLE site_settings ADD COLUMN smtp_sender VARCHAR(255) DEFAULT NULL');
        console.log('Added smtp_sender column successfully.');
    } catch (e) {
        console.log('Note (smtp_sender):', e.message);
    }
    try {
        await db.query('ALTER TABLE site_settings ADD COLUMN smtp_secure TINYINT(1) DEFAULT 0');
        console.log('Added smtp_secure column successfully.');
    } catch (e) {
        console.log('Note (smtp_secure):', e.message);
    }
    try {
        await db.query('ALTER TABLE site_settings ADD COLUMN smtp_enabled TINYINT(1) DEFAULT 0');
        console.log('Added smtp_enabled column successfully.');
    } catch (e) {
        console.log('Note (smtp_enabled):', e.message);
    }
    console.log('Migration finished.');
    process.exit(0);
}

run();
