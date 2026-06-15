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

  // Employer 1: Big Mart (Verified)
  const [emp1] = await db.query(`INSERT INTO users (name, email, phone, password, role, company_name, address, google_map_link, is_verified, payment_status) 
    VALUES ('Big Mart Head Office', 'bigmart@example.com', '9876543211', 'password', 'employer', 'Big Mart', 'Main Road, Pattom', 'https://maps.app.goo.gl/bigmart', true, 'paid')
    ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`);
  
  // Employer 2: Tech Solutions (Verified)
  const [emp2] = await db.query(`INSERT INTO users (name, email, phone, password, role, company_name, address, google_map_link, is_verified, payment_status) 
    VALUES ('Tech Solutions', 'tech@example.com', '9876543212', 'password', 'employer', 'Tech Solutions', 'Technopark, Kazhakoottam', 'https://maps.app.goo.gl/techsol', true, 'paid')
    ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`);

  // Employer 3: Local Bakery (Verified)
  const [emp3] = await db.query(`INSERT INTO users (name, email, phone, password, role, company_name, address, google_map_link, is_verified, payment_status) 
    VALUES ('Anu Bakery', 'bakery@example.com', '9876543213', 'password', 'employer', 'Anu Bakery', 'Near Railway Station, Neyyattinkara', 'https://maps.app.goo.gl/anubakery', true, 'paid')
    ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`);

  const id1 = emp1.insertId;
  const id2 = emp2.insertId;
  const id3 = emp3.insertId;

  // Jobs for Big Mart (Multiple)
  await db.query(`INSERT IGNORE INTO jobs (employer_id, title, description, location, job_type) VALUES 
    (?, 'Billing Clerk', 'Handle billing and customer queries at help desk.', 'Pattom', 'Full-time'),
    (?, 'Inventory Manager', 'Manage stock and warehouse entries.', 'Kazhakoottam', 'Full-time'),
    (?, 'Cleaning Staff', 'Night shift cleaning and maintenance.', 'Pattom', 'Part-time')`, 
    [id1, id1, id1]);

  // Jobs for Tech Solutions
  await db.query(`INSERT IGNORE INTO jobs (employer_id, title, description, location, job_type) VALUES 
    (?, 'Data Entry Operator', 'Simple data entry work. Freshers welcome.', 'Vazhuthacaud', 'Full-time'),
    (?, 'Support Executive', 'Assist clients over phone and email.', 'Kazhakoottam', 'Contract')`, 
    [id2, id2]);

  // Jobs for Anu Bakery
  await db.query(`INSERT IGNORE INTO jobs (employer_id, title, description, location, job_type) VALUES 
    (?, 'Pastry Chef Assistant', 'Help in baking and decoration.', 'Neyyattinkara', 'Full-time'),
    (?, 'Counter Staff', 'Attend to customers and manage sales.', 'Neyyattinkara', 'Part-time')`, 
    [id3, id3]);

  console.log('Extra employers and job posts added successfully');
  process.exit();
}

run().catch(console.error);
