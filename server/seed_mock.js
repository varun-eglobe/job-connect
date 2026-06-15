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

  // Add a verified employer
  const [res] = await db.query(`INSERT INTO users (name, email, phone, password, role, company_name, address, google_map_link, is_verified, payment_status) 
    VALUES ('V-Mart Retail', 'vmart@example.com', '9999999999', 'password', 'employer', 'V-Mart Retail', 'Pattom Junction, Region 1', 'https://maps.app.goo.gl/6DszH', true, 'paid')
    ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`);
  
  const empId = res.insertId;

  // Add some jobs (include is_urgent)
  await db.query(`INSERT IGNORE INTO jobs (employer_id, title, description, location, job_type, is_urgent) VALUES 
    (?, 'Sales Associate', 'Urgent hiring for sales associate at Pattom branch. Good communication skills required.', 'Pattom', 'Full-time', 1),
    (?, 'Delivery Partner', 'Need delivery partners for Kazhakoottam area. Must have two-wheeler.', 'Kazhakoottam', 'Part-time', 0),
    (?, 'Office Assistant', 'Clerical work at Vazhuthacaud firm. Experience in Tally preferred.', 'Vazhuthacaud', 'Full-time', 0)`, 
    [empId, empId, empId]);

  console.log('Mock jobs and employer added');
  process.exit();
}

run().catch(console.error);
