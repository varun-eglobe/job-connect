const mysql = require('mysql2/promise');

async function test() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'jobconnect_db'
  });

  const todayStr = '2026-06-30'; // Simulate June 30th (June 29th is in the past)

  const [jobs] = await db.query('SELECT * FROM jobs WHERE is_token_based = 1');

  for (const job of jobs) {
    let slots = [];
    try {
        slots = typeof job.token_slots === 'string' ? JSON.parse(job.token_slots) : (job.token_slots || []);
    } catch (e) {
        slots = [];
    }
    const [appRows] = await db.execute('SELECT token_number FROM applications WHERE job_id = ?', [job.id]);
    const usedTokens = new Set(appRows.map(r => r.token_number).filter(n => n !== null));

    let activeTotal = 0;
    let activeRemaining = 0;
    for (const s of slots) {
        if (s.date && s.date >= todayStr) {
            for (let t = s.startNumber; t <= s.endNumber; t++) {
                activeTotal++;
                if (!usedTokens.has(t)) {
                    activeRemaining++;
                }
            }
        }
    }
    console.log(`Job ID: ${job.id}, Title: ${job.title.substring(0, 30)}`);
    console.log(`  Active Remaining: ${activeRemaining}, Active Total: ${activeTotal}`);
    console.log(`  All Slots:`, slots.map(s => `${s.date} (Tokens ${s.startNumber}-${s.endNumber})`));
  }

  await db.end();
}

test().catch(console.error);
