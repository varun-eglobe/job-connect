const mysql = require('mysql2/promise');
require('dotenv').config();

async function addSalaryField() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'jobconnect_db'
    });
    
    try {
        await db.query('ALTER TABLE jobs ADD COLUMN salary_range VARCHAR(255) NULL');
        console.log("Successfully added salary_range column to jobs table.");
    } catch (e) {
        console.error("Column might already exist or error:", e.message);
    }
    
    await db.end();
}
addSalaryField();
