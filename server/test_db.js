const mysql = require('mysql2/promise');

async function test() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'jobconnect_db'
    });
    
    const newText = "TEST_VALUE_" + Date.now();
    console.log("Setting value to:", newText);
    
    await db.query('UPDATE site_settings SET pdf_footer_text = ? WHERE id = 1', [newText]);
    
    const [rows] = await db.query('SELECT pdf_footer_text FROM site_settings WHERE id = 1');
    console.log("Value in DB now:", rows[0].pdf_footer_text);
    
    await db.end();
}
test();
