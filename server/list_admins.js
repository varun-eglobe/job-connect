const db = require('./db');

const run = async () => {
    try {
        const [rows] = await db.query('SELECT id, name, email, role, is_verified, is_approved FROM users');
        console.log("Users in Database:");
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
