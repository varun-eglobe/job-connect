const mysql = require('mysql2/promise');
const path = require('path');

async function check() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'jobconnect_db'
    });
    const [rows] = await db.query('DESCRIBE site_settings');
    console.log(JSON.stringify(rows, null, 2));
    await db.end();
}
check();
