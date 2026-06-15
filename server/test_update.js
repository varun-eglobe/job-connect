const db = require('./db');
async function testUpdate() {
  try {
    const data = {
      banner_title: 'Test Title',
      banner_subtitle: 'Test Subtitle',
      box1_title: '1', box1_text: 'a',
      box2_title: '2', box2_text: 'b',
      box3_title: '3', box3_text: 'c'
    };
    
    await db.query(`
        UPDATE site_settings SET 
        banner_title = ?, banner_subtitle = ?, 
        box1_title = ?, box1_text = ?, 
        box2_title = ?, box2_text = ?, 
        box3_title = ?, box3_text = ?
        WHERE id = 1
    `, [data.banner_title, data.banner_subtitle, data.box1_title, data.box1_text, data.box2_title, data.box2_text, data.box3_title, data.box3_text]);
    
    console.log('Update successful');
  } catch (err) {
    console.error('Update failed:', err);
  }
  process.exit();
}
testUpdate();
