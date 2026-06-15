const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'jobconnect_db'
  });

  const [rows] = await db.query(`
    SELECT id, name, email, phone, role, company_name, is_verified, is_approved FROM users
  `);
  console.log('Users in database:', rows);
  
  process.exit();
}

check().catch(console.error);
