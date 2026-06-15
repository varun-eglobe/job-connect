const mysql = require('mysql2/promise');

async function check() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'jobconnect_db'
    });
    const [rows] = await db.query('SELECT * FROM site_settings WHERE id = 1');
    console.log(JSON.stringify(rows[0], null, 2));
    await db.end();
}
check();
