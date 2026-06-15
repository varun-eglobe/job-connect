const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        console.log("Fixing helpdesks table...");
        // Change type from ENUM to VARCHAR and make it nullable
        await db.execute("ALTER TABLE helpdesks MODIFY COLUMN type VARCHAR(255) NULL");
        console.log("✅ Success! Database is now flexible.");
    } catch (err) {
        console.error("❌ Error fixing database:", err.message);
    } finally {
        await db.end();
    }
}

fix();
