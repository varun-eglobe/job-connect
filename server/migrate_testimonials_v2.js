const db = require('./db');

const up = async () => {
    try {
        await db.execute('ALTER TABLE testimonials ADD COLUMN image_url LONGTEXT');
        console.log("Column image_url added to testimonials table!");
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log("Column image_url already exists.");
        } else {
            console.error(err);
            process.exit(1);
        }
    }
    process.exit(0);
};

up();
