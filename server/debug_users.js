const mysql = require('mysql2/promise');

async function run() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'jobconnect_db'
  });

  const [rows] = await db.query('SELECT id, name, email, phone, password, role FROM users');
  console.log('Current Users in Database:');
  console.log(rows);
  process.exit();
}

run().catch(console.error);
