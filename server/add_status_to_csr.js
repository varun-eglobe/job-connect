const db = require('./db');

async function run() {
    try {
        console.log("Adding status column to csr_partners...");
        await db.query("ALTER TABLE csr_partners ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active'");
        console.log("Column status added successfully.");
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log("Column status already exists.");
        } else {
            console.error("Migration failed:", err);
        }
    } finally {
        process.exit(0);
    }
}

run();
