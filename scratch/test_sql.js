const db = require('../server/db');
const search = 'lulu';
const searchPattern = `%${search.toLowerCase()}%`;
const sql = 'SELECT jobs.*, users.company_name, users.address, users.google_map_link, users.is_verified FROM jobs JOIN users ON jobs.employer_id = users.id WHERE 1=1 AND jobs.status = "active" AND users.is_approved = 1 AND users.payment_status = "paid" AND (LOWER(jobs.title) LIKE ? OR LOWER(jobs.description) LIKE ? OR LOWER(users.company_name) LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?';
const params = [searchPattern, searchPattern, searchPattern, 10, 0];

db.query(sql, params).then(([rows]) => {
    console.log('Rows found:', rows.length);
    if (rows.length > 0) {
        console.log('Match found:', rows[0].company_name);
    }
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
