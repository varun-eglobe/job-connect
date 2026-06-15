const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../server/.env' });

async function reset() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'jobconnect_db'
        });
        
        await db.execute('UPDATE users SET is_gst_verified = 0, gst_number = ""');
        console.log("GST verification successfully cleared for all users.");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
reset();
