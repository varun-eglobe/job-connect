const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

async function update() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'jobconnect_db'
    });
    
    try {
        await db.query('ALTER TABLE site_settings ADD COLUMN pdf_footer_text TEXT');
        console.log("Added pdf_footer_text column");
        
        const initialText = 'JobConnect by Local Authority. Powered by eglobe IT Solutions.';
        await db.query('UPDATE site_settings SET pdf_footer_text = ? WHERE id = 1', [initialText]);
        console.log("Updated initial value");
    } catch (e) {
        console.error("Column might already exist or error:", e.message);
    }
    
    await db.end();
}
update();
