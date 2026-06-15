const db = require('./db');

const up = async () => {
    try {
        console.log("Checking if parent_id column exists in locations...");
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'jobconnect_db' 
              AND TABLE_NAME = 'locations' 
              AND COLUMN_NAME = 'parent_id'
        `);

        if (columns.length === 0) {
            console.log("parent_id column does not exist. Modifying table...");
            await db.execute('ALTER TABLE locations ADD COLUMN parent_id INT NULL');
            console.log("parent_id column added successfully!");
            
            console.log("Adding foreign key constraint fk_locations_parent...");
            await db.execute(`
                ALTER TABLE locations 
                ADD CONSTRAINT fk_locations_parent 
                FOREIGN KEY (parent_id) 
                REFERENCES locations(id) 
                ON DELETE CASCADE
            `);
            console.log("Foreign key constraint fk_locations_parent added successfully!");
        } else {
            console.log("parent_id column already exists in locations table.");
        }
        
        console.log("Locations table migration completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

up();
