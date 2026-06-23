const mysql = require('mysql2/promise');

async function test() {
    const db = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'jobconnect_db'
    });
    
    console.log("Testing database connection...");
    const [rows] = await db.query('SELECT pdf_footer_text FROM site_settings WHERE id = 1');
    console.log("Connection successful. Value in DB:", rows[0] ? rows[0].pdf_footer_text : 'No settings found');
    
    await db.end();
}
test();
