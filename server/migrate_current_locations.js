const db = require('./db');

const run = async () => {
    try {
        console.log("Starting locations hierarchy migration...");

        // 1. Seed Kerala Districts
        const keralaDistricts = [
            "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", 
            "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad", 
            "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod"
        ];

        // 2. Seed UAE Emirates
        const uaeEmirates = [
            "Abu Dhabi", "Dubai", "Sharjah", "Ajman", 
            "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"
        ];

        const allParents = [...keralaDistricts, ...uaeEmirates];
        const parentIdMap = {};

        for (const parentName of allParents) {
            // Check if already exists
            const [rows] = await db.query('SELECT id FROM locations WHERE name = ? AND parent_id IS NULL', [parentName]);
            if (rows.length > 0) {
                console.log(`Parent location "${parentName}" already exists with ID: ${rows[0].id}`);
                parentIdMap[parentName] = rows[0].id;
            } else {
                const [result] = await db.execute('INSERT INTO locations (name, parent_id) VALUES (?, NULL)', [parentName]);
                console.log(`Created parent location "${parentName}" with ID: ${result.insertId}`);
                parentIdMap[parentName] = result.insertId;
            }
        }

        const tvmId = parentIdMap["Thiruvananthapuram"];
        if (!tvmId) {
            throw new Error("Thiruvananthapuram parent ID not found!");
        }

        // 3. Find currently flat locations (excluding newly added parent names)
        const [flatLocs] = await db.query('SELECT id, name FROM locations WHERE parent_id IS NULL');
        
        const existingFlatPlacesToMove = flatLocs.filter(loc => !allParents.includes(loc.name));

        console.log(`Found ${existingFlatPlacesToMove.length} existing flat locations to move under Thiruvananthapuram...`);

        for (const loc of existingFlatPlacesToMove) {
            await db.execute('UPDATE locations SET parent_id = ? WHERE id = ?', [tvmId, loc.id]);
            console.log(`Moved "${loc.name}" (ID: ${loc.id}) under Thiruvananthapuram (ID: ${tvmId})`);
        }

        console.log("Locations hierarchy migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
};

run();
