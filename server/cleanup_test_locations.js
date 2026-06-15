const db = require('./db');

const run = async () => {
    try {
        console.log("Cleaning up and restructuring Dubai sub-places...");

        // Get Dubai's parent ID
        const [dubaiRows] = await db.query('SELECT id FROM locations WHERE name = "Dubai" AND parent_id IS NULL');
        if (dubaiRows.length === 0) {
            console.log("Dubai parent not found.");
            process.exit(1);
        }
        const dubaiId = dubaiRows[0].id;

        // Delete previous test names if any
        await db.execute('DELETE FROM locations WHERE name = "Deira, Marina, Jumeirah"');
        await db.execute('DELETE FROM locations WHERE name = "Deira"');
        await db.execute('DELETE FROM locations WHERE name = "Marina"');
        await db.execute('DELETE FROM locations WHERE name = "Jumeirah"');

        // Add correct sub places under Dubai
        const dubaiSubPlaces = ["Deira", "Marina", "Jumeirah"];
        for (const sub of dubaiSubPlaces) {
            await db.execute('INSERT INTO locations (name, parent_id) VALUES (?, ?)', [sub, dubaiId]);
            console.log(`Added "${sub}" under Dubai (ID: ${dubaiId})`);
        }

        console.log("Restructuring completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
