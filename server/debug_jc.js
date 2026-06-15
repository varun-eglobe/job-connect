const pool = require('./db');

async function check() {
    try {
        const [users] = await pool.execute('SELECT COUNT(*) as count FROM users');
        console.log('Job Connect Users count:', users[0].count);
        
        const [jobs] = await pool.execute('SELECT COUNT(*) as count FROM jobs');
        console.log('Job Connect Jobs count:', jobs[0].count);
        
        process.exit(0);
    } catch (err) {
        console.error('Job Connect DB check failed:', err.message);
        process.exit(1);
    }
}

check();
