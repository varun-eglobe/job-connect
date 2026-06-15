const db = require('./db');

const up = async () => {
    try {
        await db.execute('ALTER TABLE testimonials ADD COLUMN priority INT DEFAULT 0');
        console.log("Column priority added to testimonials table!");
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log("Column priority already exists.");
        } else {
            console.error(err);
            process.exit(1);
        }
    }
    process.exit(0);
};

up();
