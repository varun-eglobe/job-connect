const db = require('./db');
async function fixDb() {
  try {
    // Drop the old key-value table if it exists or just rename it
    await db.query('DROP TABLE IF EXISTS site_settings');
    
    // Create new wide table
    await db.query(`CREATE TABLE site_settings (
        id INT PRIMARY KEY,
        banner_title TEXT,
        banner_subtitle TEXT,
        box1_title VARCHAR(255),
        box1_text VARCHAR(255),
        box2_title VARCHAR(255),
        box2_text VARCHAR(255),
        box3_title VARCHAR(255),
        box3_text VARCHAR(255)
    )`);
    
    // Insert default row
    await db.query(`INSERT INTO site_settings (
        id, banner_title, banner_subtitle, 
        box1_title, box1_text, 
        box2_title, box2_text, 
        box3_title, box3_text
    ) VALUES (1, 
        'Connect to Local Jobs in Your Region', 
        'Connecting citizens with verified employers across Wards, Panchayats, and Kudumbashree units.',
        '1,200+', 'Active Openings',
        'Verified', 'Local Businesses',
        'Free', 'Candidate Registration'
    )`);
    
    console.log('Database schema fixed for Wide Settings');
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
fixDb();
