const db = require('./db');

async function runMigration() {
    console.log("Starting database migration for Token-Based Job Posting...");
    try {
        // 1. Update site_settings table
        try {
            await db.query('ALTER TABLE site_settings ADD COLUMN interview_rules TEXT DEFAULT NULL');
            console.log("✓ Added 'interview_rules' to site_settings table.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("• 'interview_rules' already exists in site_settings table.");
            } else {
                throw err;
            }
        }

        // 2. Update jobs table
        const jobColumns = [
            { name: 'is_token_based', definition: 'BOOLEAN DEFAULT FALSE' },
            { name: 'token_count', definition: 'INT DEFAULT 0' },
            { name: 'token_split', definition: 'INT DEFAULT 0' },
            { name: 'token_slots', definition: 'TEXT DEFAULT NULL' }
        ];

        for (const col of jobColumns) {
            try {
                await db.query(`ALTER TABLE jobs ADD COLUMN ${col.name} ${col.definition}`);
                console.log(`✓ Added '${col.name}' to jobs table.`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`• '${col.name}' already exists in jobs table.`);
                } else {
                    throw err;
                }
            }
        }

        // 3. Update applications table
        const appColumns = [
            { name: 'candidate_name', definition: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'candidate_phone', definition: 'VARCHAR(20) DEFAULT NULL' },
            { name: 'token_number', definition: 'INT DEFAULT NULL' },
            { name: 'token_slot_date', definition: 'DATE DEFAULT NULL' },
            { name: 'token_slot_time', definition: 'VARCHAR(100) DEFAULT NULL' }
        ];

        for (const col of appColumns) {
            try {
                await db.query(`ALTER TABLE applications ADD COLUMN ${col.name} ${col.definition}`);
                console.log(`✓ Added '${col.name}' to applications table.`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`• '${col.name}' already exists in applications table.`);
                } else {
                    throw err;
                }
            }
        }

        console.log("Database migration completed successfully!");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        process.exit();
    }
}

runMigration();
