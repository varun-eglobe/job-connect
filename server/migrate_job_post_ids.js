const db = require('./db');

async function migrate() {
    // 1. Add job_id_prefix to site_settings
    try {
        const [cols] = await db.query("SHOW COLUMNS FROM site_settings LIKE 'job_id_prefix'");
        if (cols.length === 0) {
            console.log("Adding job_id_prefix to site_settings...");
            await db.query("ALTER TABLE site_settings ADD COLUMN job_id_prefix VARCHAR(50) DEFAULT 'JC'");
        } else {
            console.log("job_id_prefix already exists in site_settings.");
        }
    } catch (err) {
        console.error("Error adding job_id_prefix:", err);
    }

    // 2. Add job_post_id to jobs (not unique initially)
    try {
        const [cols] = await db.query("SHOW COLUMNS FROM jobs LIKE 'job_post_id'");
        if (cols.length === 0) {
            console.log("Adding job_post_id to jobs...");
            await db.query("ALTER TABLE jobs ADD COLUMN job_post_id VARCHAR(100) DEFAULT NULL");
        } else {
            console.log("job_post_id already exists in jobs.");
        }
    } catch (err) {
        console.error("Error adding job_post_id:", err);
    }

    // 3. Migrate existing jobs
    try {
        const [jobs] = await db.query("SELECT id, created_at, job_post_id FROM jobs WHERE job_post_id IS NULL");
        console.log(`Found ${jobs.length} jobs to update...`);
        for (const job of jobs) {
            const date = job.created_at ? new Date(job.created_at) : new Date();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const yy = String(date.getFullYear()).slice(-2);
            const dateStr = `${mm}${yy}`;
            
            // Loop until unique
            let unique = false;
            let jobPostId = '';
            while (!unique) {
                const randomNum = Math.floor(1000000 + Math.random() * 9000000);
                jobPostId = `JC-${dateStr}-${randomNum}`;
                const [exists] = await db.query("SELECT id FROM jobs WHERE job_post_id = ?", [jobPostId]);
                if (exists.length === 0) {
                    unique = true;
                }
            }
            
            await db.query("UPDATE jobs SET job_post_id = ? WHERE id = ?", [jobPostId, job.id]);
            console.log(`Updated job ID ${job.id} with Job Post ID: ${jobPostId}`);
        }
    } catch (err) {
        console.error("Error updating existing jobs:", err);
    }

    // 4. Add UNIQUE constraint to job_post_id on jobs
    try {
        // Check if unique index exists
        const [indexes] = await db.query("SHOW INDEX FROM jobs WHERE Column_name = 'job_post_id'");
        if (indexes.length === 0) {
            console.log("Adding UNIQUE index to job_post_id in jobs...");
            await db.query("ALTER TABLE jobs ADD UNIQUE INDEX (job_post_id)");
        } else {
            console.log("UNIQUE index already exists on job_post_id.");
        }
    } catch (err) {
        console.error("Error adding UNIQUE index:", err);
    }

    console.log("Migration finished.");
    process.exit();
}

migrate().catch(err => {
    console.error("Migration fatal error:", err);
    process.exit(1);
});
