const db = require('./db');

async function check() {
    try {
        const [settingsCols] = await db.query('DESCRIBE site_settings');
        console.log('Columns in site_settings:', settingsCols.map(c => c.Field));
        
        const [jobsCols] = await db.query('DESCRIBE jobs');
        console.log('Columns in jobs:', jobsCols.map(c => c.Field));
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
check();

