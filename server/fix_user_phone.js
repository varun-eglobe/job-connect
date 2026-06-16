const mysql = require('mysql2/promise');

async function run() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'jobconnect_db'
  });

  console.log('Updating user phone numbers from +81... to +91...');
  const [result] = await db.query(
    "UPDATE users SET phone = '+918136877134' WHERE phone = '+8136877134'"
  );
  
  console.log(`Updated ${result.affectedRows} user(s).`);
  
  // Double check
  const [rows] = await db.query("SELECT id, name, phone FROM users WHERE name LIKE '%Varun%'");
  console.log('Current matching users:', rows);
  
  process.exit();
}

run().catch(console.error);
