const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || ''
  });

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  // split schema by semi colon
  const statements = schema.split(';').filter(str => str.trim() !== '');

  for(let statement of statements) {
    if(statement.trim()) {
      await db.query(statement);
    }
  }

  await db.query('USE jobconnect_db');
  await db.query(`INSERT IGNORE INTO helpdesks (name, type, address, contact_info) VALUES 
    ('Pattom Unit', 'Kudumbashree Unit', 'Pattom, Your Region', '9876543210'),
    ('Kazhakoottam Ward Office', 'Ward Councilor Office', 'Technopark Area', '9123456780')`);
  console.log('Database seeded successfully');
  process.exit();
}

run().catch(console.error);
