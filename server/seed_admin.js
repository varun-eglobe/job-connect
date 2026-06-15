const mysql = require('mysql2/promise');

async function run() {
  require('dotenv').config();
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'jobconnect_db'
  });

  // Admin User (Role: admin)
  await db.query(`INSERT INTO users (name, email, phone, password, role, is_verified) 
    VALUES ('Super Admin', 'admin@jobconnect.gov.in', NULL, 'admin123', 'admin', true)
    ON DUPLICATE KEY UPDATE id=id`);

  console.log('Super Admin credentials created:');
  console.log('Email: admin@jobconnect.gov.in');
  console.log('Password: admin123');
  process.exit();
}

run().catch(console.error);
