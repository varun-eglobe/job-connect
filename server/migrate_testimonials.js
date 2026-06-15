const db = require('./db');

const up = async () => {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS testimonials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                designation VARCHAR(255),
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Testimonials table created!");
        
        // Seed initial data if empty
        const [rows] = await db.execute('SELECT COUNT(*) as count FROM testimonials');
        if (rows[0].count === 0) {
            await db.execute(
                'INSERT INTO testimonials (name, designation, message) VALUES (?, ?, ?)',
                ['Hon. Mayor', 'Mayor of Local Municipality', 'Job Connect is a revolutionary step toward empowering our youth with meaningful employment opportunities right here in our city.']
            );
            await db.execute(
                'INSERT INTO testimonials (name, designation, message) VALUES (?, ?, ?)',
                ['Hon. Deputy Mayor', 'Deputy Mayor of Local Municipality', 'We are committed to bridging the gap between employers and job seekers through technology. Job Connect is that bridge.']
            );
            console.log("Seeded initial testimonials.");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

up();
