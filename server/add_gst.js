const db = require('./db');

async function addGst() {
    try {
        await db.query('ALTER TABLE users ADD COLUMN gst_number VARCHAR(255) DEFAULT NULL');
        console.log('Added gst_number column');
    } catch (e) {
        console.log(e.message);
    }
    try {
        await db.query('ALTER TABLE users ADD COLUMN is_gst_verified BOOLEAN DEFAULT FALSE');
        console.log('Added is_gst_verified column');
    } catch (e) {
        console.log(e.message);
    }
    process.exit();
}
addGst();
