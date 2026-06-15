const db = require('./db');
async function updateDb() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS site_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS cms_pages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    const defaults = [
      ['banner_title', 'Connect to Local Jobs in Your Region'],
      ['banner_subtitle', 'Connecting citizens with verified employers across Wards, Panchayats, and Kudumbashree units.'],
      ['box1_title', '1,200+'], ['box1_text', 'Active Openings'],
      ['box2_title', 'Verified'], ['box2_text', 'Local Businesses'],
      ['box3_title', 'Free'], ['box3_text', 'Candidate Registration']
    ];
    
    for (const [key, val] of defaults) {
      await db.query('INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)', [key, val]);
    }
    
    console.log('Database updated successfully');
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
updateDb();
