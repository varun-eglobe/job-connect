const db = require('./db');

async function migrate() {
    try {
        console.log("Checking and altering site_settings table...");
        
        // Add currency_code column
        try {
            await db.query(`ALTER TABLE site_settings ADD COLUMN currency_code VARCHAR(10) DEFAULT 'INR'`);
            console.log("- Added currency_code column");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("- currency_code column already exists");
            } else {
                throw err;
            }
        }

        // Add country_phone_code column
        try {
            await db.query(`ALTER TABLE site_settings ADD COLUMN country_phone_code VARCHAR(10) DEFAULT '91'`);
            console.log("- Added country_phone_code column");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("- country_phone_code column already exists");
            } else {
                throw err;
            }
        }

        // Set default values for existing row (id = 1)
        await db.query(`UPDATE site_settings SET 
            currency_code = COALESCE(currency_code, 'INR'), 
            country_phone_code = COALESCE(country_phone_code, '91') 
            WHERE id = 1`);
        console.log("- Initialized default values successfully");
        
        console.log("Migration complete!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        process.exit(0);
    }
}

migrate();
