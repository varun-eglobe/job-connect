const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

let dbError = null;

async function checkDbConnection() {
    try {
        const connection = await db.getConnection();
        connection.release();
        dbError = null;
        console.log("Database connection test: SUCCESS");
    } catch (err) {
        dbError = err;
        console.error("Database connection test: FAILED");
        console.error(err);
    }
}
checkDbConnection();

// Create admin_activity_log table if it doesn't exist
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS admin_activity_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT,
                admin_name VARCHAR(255),
                admin_email VARCHAR(255),
                action VARCHAR(100),
                target_type VARCHAR(50),
                target_id INT,
                target_label VARCHAR(255),
                ip_address VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (err) {
        console.error('Failed to create admin_activity_log table:', err.message);
    }
})();

// Helper: log an admin action
async function logActivity(req, action, targetType, targetId, targetLabel) {
    try {
        const adminId   = req.headers['x-admin-id']   || null;
        const adminName = req.headers['x-admin-name'] || 'Unknown';
        const adminEmail= req.headers['x-admin-email']|| null;
        const ip = req.headers['x-forwarded-for'] || req.ip || null;
        await db.query(
            'INSERT INTO admin_activity_log (admin_id, admin_name, admin_email, action, target_type, target_id, target_label, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [adminId, adminName, adminEmail, action, targetType, targetId, targetLabel, ip]
        );
    } catch (err) {
        console.error('logActivity error:', err.message);
    }
}
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const nodemailer = require('nodemailer');

const app = express();

function matchesAgeRange(candidateAge, ageRangeStr) {
    if (candidateAge === null || candidateAge === undefined) return true;
    if (!ageRangeStr) return true;
    const normalized = ageRangeStr.toLowerCase().trim();
    if (normalized === 'any' || normalized === 'all' || normalized === '') return true;

    // Check for ranges like "18 - 35" or "18-35" or "18 to 35"
    const rangeMatch = normalized.match(/^(\d+)\s*(?:-|to)\s*(\d+)$/);
    if (rangeMatch) {
        const min = parseInt(rangeMatch[1]);
        const max = parseInt(rangeMatch[2]);
        return candidateAge >= min && candidateAge <= max;
    }

    // Check for "+" like "18+" or "21+"
    const plusMatch = normalized.match(/^(\d+)\+$/);
    if (plusMatch) {
        const min = parseInt(plusMatch[1]);
        return candidateAge >= min;
    }

    // Check for "above" or "greater than" like "above 18" or "above 21" or "> 18"
    const aboveMatch = normalized.match(/(?:above|>|>=)\s*(\d+)/);
    if (aboveMatch) {
        const min = parseInt(aboveMatch[1]);
        return candidateAge >= min;
    }

    // Check for "below" or "less than" like "below 30" or "< 30"
    const belowMatch = normalized.match(/(?:below|<|<=)\s*(\d+)/);
    if (belowMatch) {
        const max = parseInt(belowMatch[1]);
        return candidateAge <= max;
    }

    // Check for simple single number "18"
    const singleNumberMatch = normalized.match(/^(\d+)$/);
    if (singleNumberMatch) {
        const val = parseInt(singleNumberMatch[1]);
        return candidateAge >= val;
    }

    return true; 
}

async function sendTwilioSms(twilioSid, twilioAuthToken, twilioPhone, toPhone, messageBody) {
    try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const auth = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
        
        let formattedTo = toPhone.trim();
        if (!formattedTo.startsWith('+')) {
            formattedTo = '+' + formattedTo;
        }

        const params = new URLSearchParams();
        params.append('From', twilioPhone);
        params.append('To', formattedTo);
        params.append('Body', messageBody);

        const response = await axios.post(url, params, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        console.log(`Twilio SMS sent successfully. SID: ${response.data.sid}`);
        return true;
    } catch (err) {
        console.error('Twilio SMS sending failed:', err.response?.data || err.message);
        return false;
    }
}

function getPossiblePhoneNumbers(identifier, countryPhoneCode) {
    if (!/^\+?\d+$/.test(identifier)) return [];
    
    const clean = identifier.replace(/\D/g, '');
    const list = new Set();
    
    // Add raw clean number
    list.add(clean);
    list.add(`+${clean}`);
    
    // If it starts with the country phone code, also get the sliced local number
    if (clean.startsWith(countryPhoneCode)) {
        const sliced = clean.slice(countryPhoneCode.length);
        list.add(sliced);
        list.add(`+${sliced}`);
    } else {
        // If it doesn't start with the country phone code, add the country phone code prepended version
        list.add(`${countryPhoneCode}${clean}`);
        list.add(`+${countryPhoneCode}${clean}`);
        
        // If there is a leading zero, e.g. 0501234567, try stripping it and prepending country code
        if (clean.startsWith('0')) {
            const strippedZero = clean.slice(1);
            list.add(strippedZero);
            list.add(`+${strippedZero}`);
            list.add(`${countryPhoneCode}${strippedZero}`);
            list.add(`+${countryPhoneCode}${strippedZero}`);
        }
    }
    
    // Also include the legacy fallback: slice last 10 digits
    if (clean.length > 10) {
        const last10 = clean.slice(-10);
        list.add(last10);
        list.add(`+${last10}`);
    }
    
    return Array.from(list);
}

function generateEmailHtml(appName, logoUrl, subject, text) {
    let bodyContent = text.replace(/\n/g, '<br>');
    
    // Auto-detect OTP code (4 to 6 digits) and render a premium verification badge (only for verification/otp related emails)
    const isOtpEmail = /otp|verification|security|verify|code/i.test(subject) || /otp|verification|security|verify|code/i.test(text);
    const otpMatch = isOtpEmail ? text.match(/\b\d{4,6}\b/) : null;
    if (otpMatch) {
        const otpCode = otpMatch[0];
        bodyContent = bodyContent.replace(otpCode, `<strong style="color: #4f46e5; font-size: 18px;">${otpCode}</strong>`);
        bodyContent += `
        <div style="text-align: center; margin: 35px 0; padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">Verification Security Code</div>
            <div style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; background-color: #f5f3ff; border: 2px dashed #c084fc; padding: 12px 30px; border-radius: 12px; text-align: center; font-family: monospace;">
                ${otpCode}
            </div>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 10px;">This code is valid for 5 minutes. Do not share this code with anyone.</div>
        </div>
        `;
    }

    let logoHtml = '';
    if (logoUrl && (logoUrl.startsWith('http://') || logoUrl.startsWith('https://'))) {
        logoHtml = `<img src="${logoUrl}" alt="${appName}" style="max-height: 48px; border-radius: 6px; margin-bottom: 12px;" /><br/>`;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      color: #334155;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 580px;
      margin: 30px auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5, #3730a3);
      padding: 35px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header-title {
      font-size: 26px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.025em;
      text-transform: uppercase;
    }
    .content {
      padding: 40px 35px;
      line-height: 1.7;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .body-text {
      font-size: 16px;
      color: #475569;
      margin-bottom: 24px;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 24px 35px;
      text-align: center;
      font-size: 13px;
      color: #64748b;
    }
    .footer p {
      margin: 6px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoHtml}
      <div class="header-title">${appName}</div>
    </div>
    <div class="content">
      <h2 class="title">${subject}</h2>
      <div class="body-text">
        ${bodyContent}
      </div>
    </div>
    <div class="footer">
      <p>This is an automated security transmission from <strong>${appName}</strong>.</p>
      <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
}

async function sendSmtpEmail(to, subject, text, html) {
    try {
        const [settingsRows] = await db.query('SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_sender, smtp_secure, smtp_enabled, app_name, header_logo_url FROM site_settings WHERE id = 1');
        const config = settingsRows && settingsRows[0];
        
        if (!config || config.smtp_enabled !== 1) {
            console.log('SMTP is disabled or not configured in site settings.');
            return false;
        }

        if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
            console.log('SMTP host, user or password missing in configuration.');
            return false;
        }

        const appName = config.app_name || 'Job Connect';
        const logoUrl = config.header_logo_url || '';
        const htmlBody = html || generateEmailHtml(appName, logoUrl, subject, text);

        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: config.smtp_port || 587,
            secure: config.smtp_secure === 1, // true for 465, false for other ports
            auth: {
                user: config.smtp_user,
                pass: config.smtp_pass
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: config.smtp_sender || config.smtp_user,
            to,
            subject,
            text,
            html: htmlBody
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully: ${info.messageId}`);
        return true;
    } catch (err) {
        console.error('sendSmtpEmail error:', err);
        return false;
    }
}

async function generateAndSendOtp(phone, reason) {
    let otpCode = '9999';
    try {
        const [settings] = await db.query('SELECT twilio_sid, twilio_auth_token, twilio_phone_number, twilio_enabled FROM site_settings WHERE id = 1');
        const config = settings && settings[0];
        
        if (config && config.twilio_enabled === 1 && config.twilio_sid && config.twilio_auth_token && config.twilio_phone_number) {
            otpCode = Math.floor(1000 + Math.random() * 9000).toString();
            const messageBody = `Your Job Connect OTP for ${reason} is: ${otpCode}. Valid for 5 minutes.`;
            const success = await sendTwilioSms(config.twilio_sid, config.twilio_auth_token, config.twilio_phone_number, phone, messageBody);
            if (success) {
                console.log(`Real OTP (${otpCode}) sent to ${phone} via Twilio for ${reason}.`);
                return { otpCode, sent: true };
            } else {
                console.log(`Failed to send SMS to ${phone} via Twilio. Falling back to mock OTP 9999.`);
            }
        } else {
            console.log(`Twilio is disabled or config is incomplete. Using mock OTP 9999 for ${phone}.`);
        }
    } catch (err) {
        console.error('generateAndSendOtp error:', err);
    }
    return { otpCode: '9999', sent: false };
}

// Returns true if real comms (SMTP or Twilio) are active — disables dev 9999 bypass
async function isRealModeActive() {
    try {
        const [rows] = await db.query(
            'SELECT smtp_enabled, smtp_host, smtp_user, twilio_enabled, twilio_sid FROM site_settings WHERE id = 1'
        );
        const c = rows && rows[0];
        if (!c) return false;
        const smtpActive = c.smtp_enabled === 1 && !!c.smtp_host && !!c.smtp_user;
        const twilioActive = c.twilio_enabled === 1 && !!c.twilio_sid;
        return smtpActive || twilioActive;
    } catch {
        return false;
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.resolve(__dirname, '../client/public/logos');
        console.log('Target Upload Path:', uploadPath);
        if (!fs.existsSync(uploadPath)) {
            console.log('Creating directory:', uploadPath);
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        if (file.fieldname === 'logo') {
            cb(null, 'header_logo.png');
        } else if (file.fieldname === 'icon') {
            cb(null, 'app_icon.png');
        } else if (file.fieldname === 'initiative_logo') {
            cb(null, 'initiative_logo.png');
        } else if (file.fieldname === 'powered_logo') {
            cb(null, 'powered_logo.png');
        } else if (file.fieldname === 'csr_logo') {
            cb(null, 'csr_' + Date.now() + path.extname(file.originalname));
        } else {
            cb(null, file.originalname);
        }
    }
});
const upload = multer({ storage });
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Periodic database health check every 5 seconds
const DB_CHECK_INTERVAL_MS = 5000;
let dbCheckTimer = setInterval(async () => {
    try {
        const connection = await db.getConnection();
        connection.release();
        if (dbError) {
            console.log("Database connection test: SUCCESS (recovered)");
        }
        dbError = null;
    } catch (err) {
        if (!dbError) {
            console.error("Database connection test: FAILED (went offline)");
        }
        dbError = err;
    }
}, DB_CHECK_INTERVAL_MS);
dbCheckTimer.unref(); // Don't block process exit

// Database offline check middleware
app.use((req, res, next) => {
    // Skip for health check endpoint and non-api routes
    if (req.path === '/api/health' || !req.path.startsWith('/api')) {
        return next();
    }
    if (dbError) {
        return res.status(503).json({
            error: 'Database connection is offline.',
            code: 'DB_CONNECTION_ERROR',
            details: {
                message: dbError.message,
                host: process.env.DB_HOST || '127.0.0.1',
                port: process.env.DB_PORT || 3306,
                database: process.env.DB_NAME || 'jobconnect_db'
            }
        });
    }
    next();
});

app.use('/logos', express.static(path.resolve(__dirname, '../client/public/logos')));

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        const connection = await db.getConnection();
        connection.release();
        dbError = null;
        res.json({
            status: 'healthy',
            database: 'connected',
            version: '1.3',
            details: {
                host: process.env.DB_HOST || '127.0.0.1',
                port: process.env.DB_PORT || 3306,
                database: process.env.DB_NAME || 'jobconnect_db'
            }
        });
    } catch (err) {
        dbError = err;
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            code: 'DB_CONNECTION_ERROR',
            version: '1.3',
            error: err.message,
            details: {
                message: err.message,
                host: process.env.DB_HOST || '127.0.0.1',
                port: process.env.DB_PORT || 3306,
                database: process.env.DB_NAME || 'jobconnect_db'
            }
        });
    }
});

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`, req.body);
    next();
});

// Routes
process.on('uncaughtException', (err) => console.error('CRITICAL ERROR:', err));
process.on('unhandledRejection', (reason, promise) => console.error('REJECTION:', reason));

app.get('/api/debug-check', (req, res) => res.json({ status: 'OK', message: 'If you see this, the NEW server code is running!' }));
app.get('/api/admin/csr-partners/ping', (req, res) => res.json({ status: 'CSR API Active' }));

// Helpdesk Management
app.get('/api/helpdesks', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT helpdesks.*, locations.name AS location_name FROM helpdesks LEFT JOIN locations ON helpdesks.location_id = locations.id ORDER BY helpdesks.name');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/helpdesks', async (req, res) => {
    try {
        const { name, address, contact_info, location_id } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const [existing] = await db.execute('SELECT id FROM helpdesks WHERE LOWER(name) = ?', [name.trim().toLowerCase()]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'A support location with this name already exists' });
        }
        await db.execute('INSERT INTO helpdesks (name, address, contact_info, location_id) VALUES (?, ?, ?, ?)', [name.trim(), address, contact_info, location_id || null]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/helpdesks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, contact_info, location_id } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const [existing] = await db.execute('SELECT id FROM helpdesks WHERE LOWER(name) = ? AND id != ?', [name.trim().toLowerCase(), id]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'A support location with this name already exists' });
        }
        await db.execute('UPDATE helpdesks SET name = ?, address = ?, contact_info = ?, location_id = ? WHERE id = ?', [name.trim(), address, contact_info, location_id || null, id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/helpdesks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM helpdesks WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 1. Get all jobs with optional filters and pagination
app.get('/api/jobs', async (req, res) => {
    try {
        console.log('--- NEW JOB REQUEST ---');
        console.log('Query:', req.query);
        const location = req.query.location || req.query.region;
        const job_type = req.query.job_type || req.query.type;
        const employer_id = req.query.employer_id;
        const company_name = req.query.company;
        const search = req.query.search;
        const is_urgent = req.query.is_urgent === 'true' || req.query.urgent === 'true';
        const is_verified = req.query.is_verified === 'true' || req.query.verified === 'true';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const candidate_id = req.query.candidate_id;

        // Fetch candidate's Date of Birth to calculate age if candidate_id is provided
        let candidateAge = null;
        if (candidate_id) {
            const [candidateRows] = await db.execute('SELECT dob FROM users WHERE id = ?', [candidate_id]);
            if (candidateRows.length > 0 && candidateRows[0].dob) {
                const dob = new Date(candidateRows[0].dob);
                const today = new Date();
                let age = today.getFullYear() - dob.getFullYear();
                const monthDiff = today.getMonth() - dob.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                    age--;
                }
                candidateAge = age;
            }
        }
        
        // Base query
        let query = 'SELECT jobs.*, (SELECT COUNT(*) FROM applications WHERE applications.job_id = jobs.id) as applied_count, users.company_name, users.address, users.google_map_link, users.is_verified, users.is_gst_verified FROM jobs JOIN users ON jobs.employer_id = users.id WHERE users.is_deleted_by_admin = 0';
        let countQuery = 'SELECT COUNT(*) as total FROM jobs JOIN users ON jobs.employer_id = users.id WHERE users.is_deleted_by_admin = 0';
        const params = [];
        const countParams = [];

        if (!employer_id) {
            const today = new Date().toISOString().split('T')[0];
            const candidate_id = req.query.candidate_id;
            
            if (candidate_id) {
                query += ' AND jobs.status = "active" AND (jobs.expiry_date IS NULL OR jobs.expiry_date >= ?) AND users.is_approved = 1 AND (jobs.is_token_based = 0 OR (SELECT COUNT(*) FROM applications WHERE applications.job_id = jobs.id) < jobs.token_count OR EXISTS (SELECT 1 FROM applications WHERE applications.job_id = jobs.id AND applications.candidate_id = ?))';
                countQuery += ' AND jobs.status = "active" AND (jobs.expiry_date IS NULL OR jobs.expiry_date >= ?) AND users.is_approved = 1 AND (jobs.is_token_based = 0 OR (SELECT COUNT(*) FROM applications WHERE applications.job_id = jobs.id) < jobs.token_count OR EXISTS (SELECT 1 FROM applications WHERE applications.job_id = jobs.id AND applications.candidate_id = ?))';
                params.push(today, candidate_id);
                countParams.push(today, candidate_id);
            } else {
                query += ' AND jobs.status = "active" AND (jobs.expiry_date IS NULL OR jobs.expiry_date >= ?) AND users.is_approved = 1 AND (jobs.is_token_based = 0 OR (SELECT COUNT(*) FROM applications WHERE applications.job_id = jobs.id) < jobs.token_count)';
                countQuery += ' AND jobs.status = "active" AND (jobs.expiry_date IS NULL OR jobs.expiry_date >= ?) AND users.is_approved = 1 AND (jobs.is_token_based = 0 OR (SELECT COUNT(*) FROM applications WHERE applications.job_id = jobs.id) < jobs.token_count)';
                params.push(today);
                countParams.push(today);
            }
        }

        if (location) {
            // Find if this location has children
            const [locRows] = await db.query('SELECT id FROM locations WHERE name = ?', [location]);
            if (locRows.length > 0) {
                const locId = locRows[0].id;
                const [childRows] = await db.query('SELECT name FROM locations WHERE parent_id = ?', [locId]);
                if (childRows.length > 0) {
                    const placeNames = [location, ...childRows.map(c => c.name)];
                    const placeholders = placeNames.map(() => '?').join(',');
                    query += ` AND jobs.location IN (${placeholders})`;
                    countQuery += ` AND jobs.location IN (${placeholders})`;
                    params.push(...placeNames);
                    countParams.push(...placeNames);
                } else {
                    query += ' AND jobs.location = ?';
                    countQuery += ' AND jobs.location = ?';
                    params.push(location);
                    countParams.push(location);
                }
            } else {
                query += ' AND jobs.location = ?';
                countQuery += ' AND jobs.location = ?';
                params.push(location);
                countParams.push(location);
            }
        }
        if (job_type) {
            const types = job_type.split(',').map(t => t.trim()).filter(Boolean);
            if (types.length > 0) {
                const clauses = types.map(() => 'jobs.job_type LIKE ?').join(' OR ');
                query += ` AND (${clauses})`;
                countQuery += ` AND (${clauses})`;
                types.forEach(t => {
                    const pattern = `%${t}%`;
                    params.push(pattern);
                    countParams.push(pattern);
                });
            }
        }
        if (employer_id) {
            query += ' AND jobs.employer_id = ?';
            countQuery += ' AND jobs.employer_id = ?';
            params.push(employer_id);
            countParams.push(employer_id);
        }
        if (company_name) {
            query += ' AND users.company_name = ?';
            countQuery += ' AND users.company_name = ?';
            params.push(company_name);
            countParams.push(company_name);
        }
        if (search) {
            const searchPattern = `%${search.toLowerCase()}%`;
            query += ' AND (LOWER(jobs.title) LIKE ? OR LOWER(jobs.description) LIKE ? OR LOWER(users.company_name) LIKE ?)';
            countQuery += ' AND (LOWER(jobs.title) LIKE ? OR LOWER(jobs.description) LIKE ? OR LOWER(users.company_name) LIKE ?)';
            params.push(searchPattern, searchPattern, searchPattern);
            countParams.push(searchPattern, searchPattern, searchPattern);
        }
        if (is_urgent) {
            query += ' AND jobs.is_urgent = 1';
            countQuery += ' AND jobs.is_urgent = 1';
        }
        if (is_verified) {
            query += ' AND users.is_verified = 1';
            countQuery += ' AND users.is_verified = 1';
        }
        
        let rows, total;
        if (candidateAge !== null) {
            // We have candidate age. We need to filter by age range requirement in memory.
            const baseQuery = query + ' ORDER BY created_at DESC';
            
            const fs = require('fs');
            const logMsg = `[${new Date().toISOString()}]
SQL: ${baseQuery}
Params: ${JSON.stringify(params)}
Count SQL: ${countQuery}
Count Params: ${JSON.stringify(countParams)}
-----------------------------------\n`;
            fs.appendFileSync('sql_debug.log', logMsg);

            const [allRows] = await db.query(baseQuery, params);
            
            // Filter by age match
            const filteredRows = allRows.filter(job => matchesAgeRange(candidateAge, job.age_range));
            
            total = filteredRows.length;
            rows = filteredRows.slice(offset, offset + limit);
        } else {
            // Standard SQL query with limit & offset
            const finalQuery = query + ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            const queryParams = [...params, limit, offset];
            
            const fs = require('fs');
            const logMsg = `[${new Date().toISOString()}]
SQL: ${finalQuery}
Params: ${JSON.stringify(queryParams)}
Count SQL: ${countQuery}
Count Params: ${JSON.stringify(countParams)}
-----------------------------------\n`;
            fs.appendFileSync('sql_debug.log', logMsg);

            const [dbRows] = await db.query(finalQuery, queryParams);
            const [totalRows] = await db.query(countQuery, countParams);
            rows = dbRows;
            total = totalRows[0].total;
        }
        
        res.json({
            jobs: rows,
            total: total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching jobs' });
    }
});



// 1.5 Get a single job by ID with similar jobs
app.get('/api/jobs/:id', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        let [jobs] = await db.execute(
            'SELECT jobs.*, (SELECT COUNT(*) FROM applications WHERE applications.job_id = jobs.id) as applied_count, users.company_name, users.address, users.google_map_link, users.email, users.phone, users.is_verified, users.is_gst_verified FROM jobs JOIN users ON jobs.employer_id = users.id WHERE jobs.id = ? AND jobs.status = "active" AND (jobs.expiry_date IS NULL OR jobs.expiry_date >= ?) AND users.is_approved = 1 AND users.is_deleted_by_admin = 0',
            [req.params.id, today]
        );
        
        if (jobs.length === 0) {
            // Fallback for employer who created the job to view it
            const [fallbackJobs] = await db.execute(
                'SELECT jobs.*, (SELECT COUNT(*) FROM applications WHERE applications.job_id = jobs.id) as applied_count, users.company_name, users.address, users.google_map_link, users.email, users.phone, users.is_verified, users.is_gst_verified FROM jobs JOIN users ON jobs.employer_id = users.id WHERE jobs.id = ? AND users.is_deleted_by_admin = 0',
                [req.params.id]
            );
            if (fallbackJobs.length > 0) {
                jobs = fallbackJobs;
            } else {
                return res.status(404).json({ error: 'Job not found' });
            }
        }
        
        const [similarJobs] = await db.execute(
            'SELECT jobs.*, users.company_name, users.is_verified FROM jobs JOIN users ON jobs.employer_id = users.id WHERE jobs.id != ? AND jobs.status = "active" AND (jobs.expiry_date IS NULL OR jobs.expiry_date >= ?) AND (jobs.job_type = ? OR jobs.location = ?) AND users.is_approved = 1 AND users.is_deleted_by_admin = 0 ORDER BY created_at DESC LIMIT 3',
            [req.params.id, today, jobs[0].job_type, jobs[0].location]
        );
        
        res.json({ job: jobs[0], similarJobs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching job details' });
    }
});

// Top Searches based on Job Availability
app.get('/api/top-searches', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [rows] = await db.execute(`
            SELECT jobs.title, SUM(jobs.vacancies_count) as total_vacancies
            FROM jobs 
            JOIN users ON jobs.employer_id = users.id
            WHERE jobs.status = "active" 
              AND (jobs.expiry_date IS NULL OR jobs.expiry_date >= ?)
              AND users.is_approved = 1
              AND users.is_deleted_by_admin = 0
            GROUP BY jobs.title
            ORDER BY total_vacancies DESC
            LIMIT 5
        `, [today]);
        
        res.json(rows.map(row => row.title));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching top searches' });
    }
});

// 4. Verification Check and Job Posting
app.post('/api/jobs', async (req, res) => {
    try {
        const { employer_id, title, description, location, job_type, vacancies_count, expiry_date, contact_person, contact_phone, status, is_urgent, salary_range, is_token_based, token_count, token_split, token_slots, age_range, qualification } = req.body;
        
        const [users] = await db.execute('SELECT payment_status FROM users WHERE id = ? AND is_deleted_by_admin = 0', [employer_id]);
        
        if (users.length === 0) return res.status(404).json({ error: 'Employer not found' });
        // Registration fee removed
        // if (users[0].payment_status !== 'paid') return res.status(403).json({ error: 'Registration fee not paid.' });

        // Get prefix from site_settings
        const [settings] = await db.execute('SELECT job_id_prefix FROM site_settings WHERE id = 1');
        const prefix = (settings && settings[0] && settings[0].job_id_prefix) || 'JC';
        
        // Generate unique job_post_id
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        const dateStr = `${mm}${yy}`;
        
        let unique = false;
        let jobPostId = '';
        let attempts = 0;
        while (!unique && attempts < 100) {
            attempts++;
            const randomNum = Math.floor(1000000 + Math.random() * 9000000);
            jobPostId = `${prefix}-${dateStr}-${randomNum}`;
            const [exists] = await db.execute('SELECT id FROM jobs WHERE job_post_id = ?', [jobPostId]);
            if (exists.length === 0) {
                unique = true;
            }
        }

        const [result] = await db.execute(
            'INSERT INTO jobs (employer_id, title, description, location, job_type, vacancies_count, expiry_date, contact_person, contact_phone, status, is_urgent, salary_range, job_post_id, is_token_based, token_count, token_split, token_slots, age_range, qualification) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                employer_id, title, description, location, job_type, vacancies_count || 1, expiry_date || null, contact_person || null, contact_phone || null, status || 'active', is_urgent || false, salary_range || null, jobPostId,
                is_token_based ? 1 : 0, token_count || 0, token_split || 0, token_slots ? (typeof token_slots === 'string' ? token_slots : JSON.stringify(token_slots)) : null,
                age_range || null, qualification || null
            ]
        );
        res.json({ id: result.insertId, job_post_id: jobPostId, message: 'Job posted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error posting job' });
    }
});

app.put('/api/jobs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, location, job_type, vacancies_count, expiry_date, contact_person, contact_phone, status, employer_id, is_urgent, salary_range, is_token_based, token_count, token_split, token_slots, age_range, qualification } = req.body;

        // Verify ownership
        const [jobs] = await db.execute('SELECT employer_id FROM jobs WHERE id = ?', [id]);
        if (jobs.length === 0) return res.status(404).json({ error: 'Job not found' });
        if (jobs[0].employer_id != employer_id) return res.status(403).json({ error: 'Unauthorized to edit this job' });

        // Enforce token count restriction
        const isTokenBased = is_token_based === true || is_token_based === 'true' || is_token_based === 1 || is_token_based === '1';
        const [countRows] = await db.execute('SELECT COUNT(*) as total FROM applications WHERE job_id = ?', [id]);
        const appliedCount = countRows[0].total;

        const [jobRows] = await db.execute('SELECT is_token_based FROM jobs WHERE id = ?', [id]);
        const wasTokenBased = jobRows.length > 0 && (jobRows[0].is_token_based === 1 || jobRows[0].is_token_based === true);

        if (appliedCount > 0) {
            if (wasTokenBased && !isTokenBased) {
                return res.status(400).json({ 
                    error: `Cannot disable token-based management because candidates have already applied to this job (${appliedCount}).` 
                });
            }
            if (isTokenBased) {
                if (Number(token_count || 0) < appliedCount) {
                    return res.status(400).json({ 
                        error: `Token count cannot be less than the number of candidates who have already applied (${appliedCount}).` 
                    });
                }
            }
        } else if (isTokenBased && Number(token_count || 0) <= 0) {
            return res.status(400).json({ 
                error: 'Token count must be greater than 0.' 
            });
        }

        await db.execute(
            'UPDATE jobs SET title = ?, description = ?, location = ?, job_type = ?, vacancies_count = ?, expiry_date = ?, contact_person = ?, contact_phone = ?, status = ?, is_urgent = ?, salary_range = ?, is_token_based = ?, token_count = ?, token_split = ?, token_slots = ?, age_range = ?, qualification = ? WHERE id = ?',
            [
                title, description, location, job_type, vacancies_count, expiry_date, contact_person, contact_phone, status, is_urgent, salary_range,
                isTokenBased ? 1 : 0, token_count || 0, token_split || 0, token_slots ? (typeof token_slots === 'string' ? token_slots : JSON.stringify(token_slots)) : null,
                age_range || null, qualification || null,
                id
            ]
        );
        res.json({ success: true, message: 'Job updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
});

// Candidate Job Application (Token-based if configured)
app.post('/api/jobs/:id/apply', async (req, res) => {
    try {
        const jobId = req.params.id;
        const { candidate_id, candidate_name, candidate_phone } = req.body;
        
        if (!candidate_id || !candidate_name || !candidate_phone) {
            return res.status(400).json({ error: 'Candidate ID, name, and phone are required to apply.' });
        }

        // Check if already applied
        const [existing] = await db.execute(
            'SELECT id, token_number, token_slot_date, token_slot_time FROM applications WHERE job_id = ? AND candidate_id = ?',
            [jobId, candidate_id]
        );
        if (existing.length > 0) {
            return res.status(400).json({ 
                error: 'You have already applied for this job.', 
                already_applied: true,
                application: existing[0] 
            });
        }

        // Fetch job details
        const [jobRows] = await db.execute('SELECT * FROM jobs WHERE id = ?', [jobId]);
        if (jobRows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        const job = jobRows[0];

        let tokenNumber = null;
        let tokenSlotDate = null;
        let tokenSlotTime = null;

        if (job.is_token_based) {
            // Get current application count
            const [countRows] = await db.execute('SELECT COUNT(*) as total FROM applications WHERE job_id = ?', [jobId]);
            const appliedCount = countRows[0].total;
            
            if (appliedCount >= job.token_count) {
                return res.status(400).json({ error: 'All available interview tokens for this job have been booked.' });
            }

            tokenNumber = appliedCount + 1;

            // Parse token slots
            let slots = [];
            try {
                slots = typeof job.token_slots === 'string' ? JSON.parse(job.token_slots) : (job.token_slots || []);
            } catch (e) {
                slots = [];
            }

            // Find matching slot where tokenNumber falls in range [startNumber, endNumber]
            const matchingSlot = slots.find(s => tokenNumber >= s.startNumber && tokenNumber <= s.endNumber);
            if (matchingSlot) {
                tokenSlotDate = matchingSlot.date || null;
                tokenSlotTime = `${matchingSlot.startTime} - ${matchingSlot.endTime}`;
            }
        }

        // Insert application
        const [result] = await db.execute(
            'INSERT INTO applications (job_id, candidate_id, candidate_name, candidate_phone, token_number, token_slot_date, token_slot_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [jobId, candidate_id, candidate_name, candidate_phone, tokenNumber, tokenSlotDate, tokenSlotTime]
        );

        res.json({
            success: true,
            application_id: result.insertId,
            token_number: tokenNumber,
            token_slot_date: tokenSlotDate,
            token_slot_time: tokenSlotTime
        });

    } catch (err) {
        console.error('Job Apply Error:', err);
        res.status(500).json({ error: 'Server error processing application' });
    }
});

// Candidate Applications Retrieval
app.get('/api/candidates/:id/applications', async (req, res) => {
    try {
        const candidateId = req.params.id;
        const [rows] = await db.execute(
            `SELECT 
                a.id as application_id,
                a.status as application_status,
                a.candidate_name,
                a.candidate_phone,
                a.token_number,
                a.token_slot_date,
                a.token_slot_time,
                a.created_at as applied_at,
                j.id as job_id,
                j.title as job_title,
                j.location as job_location,
                j.job_post_id,
                u.company_name,
                u.address as company_address,
                u.google_map_link,
                u.is_deleted_by_admin
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN users u ON j.employer_id = u.id
            WHERE a.candidate_id = ?
            ORDER BY a.created_at DESC`,
            [candidateId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Fetch Candidate Applications Error:', err);
        res.status(500).json({ error: 'Server error fetching applications' });
    }
});

// Job Applicants Retrieval (Employer view)
app.get('/api/jobs/:id/applications', async (req, res) => {
    try {
        const jobId = req.params.id;
        const [rows] = await db.execute(
            `SELECT 
                a.id as application_id,
                a.candidate_id,
                a.candidate_name,
                a.candidate_phone,
                a.token_number,
                a.token_slot_date,
                a.token_slot_time,
                a.created_at as applied_at,
                u.name as registered_name,
                u.phone as registered_phone
            FROM applications a
            JOIN users u ON a.candidate_id = u.id
            WHERE a.job_id = ? AND u.is_deleted_by_admin = 0
            ORDER BY a.token_number ASC, a.created_at ASC`,
            [jobId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Fetch Job Applications Error:', err);
        res.status(500).json({ error: 'Server error fetching job applications' });
    }
});


// 1.1 Get employers with vacancies
app.get('/api/employers', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT u.id, u.company_name, u.email, u.phone, u.is_verified, u.is_gst_verified, COUNT(j.id) as job_count
            FROM users u 
            LEFT JOIN jobs j ON u.id = j.employer_id AND j.status = 'active'
            WHERE u.role = 'employer' AND u.is_approved = 1 AND u.is_deleted_by_admin = 0
        `;
        const params = [];
        if (search) {
            query += ` AND (LOWER(u.company_name) LIKE ? OR u.phone LIKE ?)`;
            params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
        }
        query += ` GROUP BY u.id`;
        
        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching companies' });
    }
});

app.get('/api/employers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch company info
        const [companies] = await db.execute(
            'SELECT id, name, company_name, email, phone, address, google_map_link, is_verified, is_gst_verified, created_at FROM users WHERE id = ? AND role = "employer" AND is_deleted_by_admin = 0',
            [id]
        );
        
        if (companies.length === 0) return res.status(404).json({ error: 'Employer not found' });
        
        // Fetch their active jobs
        const [jobs] = await db.execute(
            'SELECT *, (SELECT COUNT(*) FROM applications WHERE applications.job_id = jobs.id) as applied_count FROM jobs WHERE employer_id = ? AND status = "active" AND (expiry_date IS NULL OR expiry_date >= ?) AND (is_token_based = 0 OR (SELECT COUNT(*) FROM applications WHERE applications.job_id = jobs.id) < token_count) ORDER BY created_at DESC',
            [id, today]
        );
        
        res.json({ employer: companies[0], jobs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching employer details' });
    }
});

// Branding & Config (Moved here for better matching)
app.post('/api/branding-config', handleSettingsUpdate);
app.put('/api/branding-config', handleSettingsUpdate);
app.post('/api/branding-upload', upload.single('icon'), (req, res) => {
    res.json({ success: true, url: '/logos/app_icon.png' });
});

app.post('/api/header-logo-upload', upload.single('logo'), (req, res) => {
    res.json({ success: true, url: '/logos/header_logo.png' });
});

app.post('/api/initiative-logo-upload', upload.single('initiative_logo'), (req, res) => {
    res.json({ success: true, url: '/logos/initiative_logo.png' });
});

app.post('/api/powered-logo-upload', upload.single('powered_logo'), (req, res) => {
    res.json({ success: true, url: '/logos/powered_logo.png' });
});


const pendingRegistrations = new Map();

// 2. Register candidate or employer (Step 1: Check inputs, generate OTP)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, phone, password, role, company_name, address, google_map_link, gst_number } = req.body;
        console.log('--- REGISTER DEBUG ---');
        console.log('Body:', req.body);
        console.log('Extracted Phone:', phone);
        
        if (!phone) {
            console.log('Validation failed: phone is missing');
            return res.status(400).json({ error: 'Mobile number is required' });
        }

        const { dob } = req.body;
        if (role === 'candidate' && (!dob || String(dob).trim() === '')) {
            return res.status(400).json({ error: 'Date of Birth is required for candidates' });
        }

        if (!name || !password || !role) {
            return res.status(400).json({ error: 'Name, password, and role are required' });
        }

        // Check if phone number is already registered
        const [existingPhone] = await db.query('SELECT id FROM users WHERE phone = ? AND is_deleted_by_admin = 0', [phone]);
        if (existingPhone.length > 0) {
            return res.status(400).json({ error: 'Mobile number already registered' });
        }

        // Check if email is already registered (only if email is provided)
        if (email) {
            const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ? AND is_deleted_by_admin = 0', [email]);
            if (existingEmail.length > 0) {
                return res.status(400).json({ error: 'Email address already registered' });
            }
        }
        
        // Generate registration OTP
        const transactionToken = Math.random().toString(36).substring(2, 15);
        const otpResult = await generateAndSendOtp(phone, 'Registration');
        const otpCode = otpResult.otpCode; 

        pendingRegistrations.set(transactionToken, {
            data: { name, email, phone, password, role, company_name, address, google_map_link, gst_number, dob },
            otp: otpCode,
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        console.log(`Registration OTP generated for ${phone}: ${otpCode} (Token: ${transactionToken}) [${otpResult.sent ? 'Twilio Mode' : 'Local Mode'}]`);

        res.json({
            otp_required: true,
            transaction_token: transactionToken,
            message: otpResult.sent ? 'OTP sent to your registered mobile number' : 'OTP generated (Dev Mode: 9999)'
        });
    } catch (err) {
        console.error('Registration Error:', err.message);
        res.status(500).json({ error: 'Server error during registration', details: err.message });
    }
});

// 2.1 Verify registration OTP and complete registration
app.post('/api/auth/register/verify-otp', async (req, res) => {
    try {
        const { transaction_token, otp_code } = req.body;
        if (!transaction_token || !otp_code) {
            return res.status(400).json({ error: 'Transaction token and OTP code are required' });
        }

        const session = pendingRegistrations.get(transaction_token);
        if (!session) {
            return res.status(400).json({ error: 'Invalid or expired session' });
        }

        if (session.expires < Date.now()) {
            pendingRegistrations.delete(transaction_token);
            return res.status(400).json({ error: 'OTP has expired' });
        }

        const realMode = await isRealModeActive();
        const devBypassAllowed = !realMode && otp_code === '9999';
        if (otp_code !== session.otp && !devBypassAllowed) {
            return res.status(401).json({ error: 'Invalid OTP code' });
        }

        // OTP verified - Complete registration by inserting into database
        const { name, email, phone, password, role, company_name, address, google_map_link, gst_number, dob } = session.data;
        pendingRegistrations.delete(transaction_token);

        // Double check uniqueness just in case it was registered in the meantime
        const [existingPhone] = await db.query('SELECT id FROM users WHERE phone = ? AND is_deleted_by_admin = 0', [phone]);
        if (existingPhone.length > 0) {
            return res.status(400).json({ error: 'Mobile number already registered' });
        }

        if (email) {
            const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ? AND is_deleted_by_admin = 0', [email]);
            if (existingEmail.length > 0) {
                return res.status(400).json({ error: 'Email address already registered' });
            }
        }

        console.log('Saving registered user to DB:', { name, role, phone });
        const [result] = await db.execute(
            'INSERT INTO users (name, email, phone, password, role, company_name, address, google_map_link, gst_number, is_verified, dob) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email || null, phone || null, password, role, role === 'employer' ? company_name : null, address || null, google_map_link || null, gst_number || null, false, dob || null]
        );

        if (role === 'employer') {
            try {
                // Fetch all admins and staff who are active and not deleted
                const [adminRows] = await db.query(
                    'SELECT name, email, permissions FROM users WHERE (role = "admin" OR role = "staff") AND is_deleted_by_admin = 0'
                );

                const eligibleAdmins = adminRows.filter(admin => {
                    const adminEmail = admin.email;
                    const adminName = admin.name;
                    if (!adminEmail) return false;

                    // Super Admins automatically have access
                    if (adminEmail === 'admin@jobconnect.gov.in' || adminName === 'Super Admin') {
                        return true;
                    }

                    // Check permissions JSON
                    let perms = {};
                    if (typeof admin.permissions === 'string') {
                        try { perms = JSON.parse(admin.permissions); } catch (e) { perms = {}; }
                    } else if (admin.permissions) {
                        perms = admin.permissions;
                    }

                    return perms.super_admin === true || perms.manage_employers === true;
                });

                if (eligibleAdmins.length > 0) {
                    const subject = `New Employer Account Registered: ${company_name}`;
                    const text = `Hello,

A new employer account has been registered on Job Connect.

Details:
- Company/Business Name: ${company_name}
- Contact Person: ${name}
- Phone: ${phone}

Please log in to the Administrator Control Panel to review and verify this registration request.

Best regards,
Job Connect System`;

                    // Send email to each eligible admin concurrently without blocking response
                    Promise.all(eligibleAdmins.map(admin => sendSmtpEmail(admin.email, subject, text)))
                        .then(() => {
                            console.log(`Notification emails successfully dispatched to ${eligibleAdmins.length} admins.`);
                        })
                        .catch(err => {
                            console.error('Error sending notification emails to admins:', err);
                        });
                }
            } catch (err) {
                console.error('Failed to notify admins of new employer registration:', err);
            }
        }

        res.json({ id: result.insertId, message: 'User registered successfully', role, name, company_name: role === 'employer' ? company_name : null });
    } catch (err) {
        console.error('Registration OTP verification failed:', err);
        res.status(500).json({ error: 'OTP verification failed' });
    }
});

const pendingLogins = new Map();

app.get('/api/auth/debug-accounts', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, phone, email, password, role, company_name FROM users WHERE is_deleted_by_admin = 0');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch debug accounts' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        let { identifier, password } = req.body;
        console.log(`Login attempt for: [${identifier}]`);
        
        const [settingsRows] = await db.query('SELECT country_phone_code FROM site_settings WHERE id = 1');
        const countryPhoneCode = settingsRows[0]?.country_phone_code || '91';
        
        let query = 'SELECT * FROM users WHERE (email = ?';
        let queryParams = [identifier];
        
        const possiblePhones = getPossiblePhoneNumbers(identifier, countryPhoneCode);
        if (possiblePhones.length > 0) {
            query += ' OR phone IN (' + possiblePhones.map(() => '?').join(', ') + ')';
            queryParams.push(...possiblePhones);
        }
        
        query += ') AND password = ? AND is_deleted_by_admin = 0';
        queryParams.push(password);

        const [rows] = await db.query(query, queryParams);
        
        if (rows.length === 0) {
            console.log('Login failed: User not found or password mismatch');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = rows[0];
        // Don't allow admins to log in via standard user login endpoint
        if (user.role === 'admin') {
            console.log(`Login failed: Admin attempt on standard user endpoint (ID: ${user.id})`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Restrict email login strictly to admin roles
        if (identifier.includes('@') && user.role !== 'admin') {
            console.log(`Login failed: Email login blocked for user ID ${user.id} (role: ${user.role})`);
            return res.status(403).json({ error: 'Email login is not allowed for candidates and employers. Please log in using your registered mobile number.' });
        }
        
        // Credentials valid, trigger OTP flow
        const transactionToken = Math.random().toString(36).substring(2, 15);
        const mobile = rows[0].phone;
        const otpResult = await generateAndSendOtp(mobile, 'Login');
        const otpCode = otpResult.otpCode;
        
        pendingLogins.set(transactionToken, {
            user: rows[0],
            otp: otpCode,
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        console.log(`OTP generated for ${identifier}: ${otpCode} (Token: ${transactionToken}) [${otpResult.sent ? 'Twilio Mode' : 'Local Mode'}]`);

        res.json({ 
            otp_required: true, 
            transaction_token: transactionToken,
            message: otpResult.sent ? 'OTP sent to your registered mobile number' : 'OTP generated (Dev Mode: 9999)'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/admin-login', async (req, res) => {
    try {
        let { identifier, password } = req.body;
        console.log(`Admin gateway login attempt for: [${identifier}]`);
        
        // Query user and enforce role = 'admin'
        const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND role = "admin" AND password = ? AND is_deleted_by_admin = 0', [identifier, password]);
        
        if (rows.length === 0) {
            console.log('Admin login failed: Admin user not found or password mismatch');
            return res.status(401).json({ error: 'Invalid administrator credentials' });
        }
        
        // Credentials valid, trigger OTP flow
        const transactionToken = Math.random().toString(36).substring(2, 15);
        const adminEmail = rows[0].email || '';
        const adminMobile = rows[0].phone || '';
        
        let otpCode = '9999';
        let otpSent = false;
        let otpSentMethod = 'local';
        
        // Fetch SMTP config to see if email sending is enabled
        const [smtpSettings] = await db.query('SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_sender, smtp_secure, smtp_enabled FROM site_settings WHERE id = 1');
        const smtpConfig = smtpSettings && smtpSettings[0];
        
        if (smtpConfig && smtpConfig.smtp_enabled === 1 && smtpConfig.smtp_host && smtpConfig.smtp_user && smtpConfig.smtp_pass && adminEmail) {
            otpCode = Math.floor(1000 + Math.random() * 9000).toString();
            const emailSubject = 'Job Connect Admin Gateway Verification Code';
            const emailText = `Your Job Connect OTP for Admin Login is: ${otpCode}. Valid for 5 minutes.`;
            const sent = await sendSmtpEmail(adminEmail, emailSubject, emailText);
            if (sent) {
                otpSent = true;
                otpSentMethod = 'email';
            }
        }
        
        if (!otpSent) {
            // Fallback to Twilio or mock OTP
            const otpResult = await generateAndSendOtp(adminMobile, 'Admin Login');
            otpCode = otpResult.otpCode;
            otpSent = otpResult.sent;
            otpSentMethod = otpResult.sent ? 'twilio' : 'local';
        }
        
        pendingLogins.set(transactionToken, {
            user: rows[0],
            otp: otpCode,
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        console.log(`OTP generated for Admin ${identifier}: ${otpCode} (Token: ${transactionToken}) [${otpSentMethod.toUpperCase()} Mode]`);

        let responseMessage = 'OTP generated (Dev Mode: 9999)';
        if (otpSentMethod === 'email') {
            responseMessage = 'OTP sent to your registered email address';
        } else if (otpSentMethod === 'twilio') {
            responseMessage = 'OTP sent to your registered mobile number';
        }

        res.json({ 
            otp_required: true, 
            transaction_token: transactionToken,
            message: responseMessage
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Admin login failed' });
    }
});

app.post('/api/auth/login/verify-otp', async (req, res) => {
    try {
        const { transaction_token, otp_code } = req.body;
        const session = pendingLogins.get(transaction_token);

        if (!session) return res.status(400).json({ error: 'Invalid or expired session' });
        if (session.expires < Date.now()) {
            pendingLogins.delete(transaction_token);
            return res.status(400).json({ error: 'OTP expired' });
        }

        const realMode1 = await isRealModeActive();
        const devBypass1 = !realMode1 && otp_code === '9999';
        if (otp_code !== session.otp && !devBypass1) {
            return res.status(401).json({ error: 'Invalid OTP code' });
        }

        // OTP Success - Complete login
        const user = session.user;
        pendingLogins.delete(transaction_token);

        let permissions = user.permissions;
        if (typeof permissions === 'string') {
            try { permissions = JSON.parse(permissions); } catch (e) { permissions = {}; }
        }

        // Master Admin Override
        if (user.email === 'admin@jobconnect.gov.in') {
            permissions = { super_admin: true };
        }

        res.json({ 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: user.role,
                company_name: user.company_name,
                permissions: permissions || {}
            } 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'OTP verification failed' });
    }
});

// Phone Verification OTP (used by Confirm Interview Slot modal when phone is changed)
const pendingPhoneVerifications = new Map();

app.post('/api/auth/phone-verify/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number is required' });

        const transactionToken = Math.random().toString(36).substring(2, 15);
        const otpResult = await generateAndSendOtp(phone, 'Phone Verification');
        const otpCode = otpResult.otpCode;

        pendingPhoneVerifications.set(transactionToken, {
            phone,
            otp: otpCode,
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        console.log(`Phone verify OTP for ${phone}: ${otpCode} (Token: ${transactionToken}) [${otpResult.sent ? 'Twilio Mode' : 'Local Mode'}]`);

        res.json({
            otp_required: true,
            transaction_token: transactionToken,
            message: otpResult.sent ? 'OTP sent to your registered mobile number' : 'OTP sent (Dev Mode: 9999)'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

app.post('/api/auth/phone-verify/verify-otp', async (req, res) => {
    try {
        const { transaction_token, otp_code } = req.body;
        if (!transaction_token || !otp_code) {
            return res.status(400).json({ error: 'Transaction token and OTP code are required' });
        }

        const session = pendingPhoneVerifications.get(transaction_token);
        if (!session) return res.status(400).json({ error: 'Invalid or expired session' });
        if (session.expires < Date.now()) {
            pendingPhoneVerifications.delete(transaction_token);
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }
        const realMode2 = await isRealModeActive();
        const devBypass2 = !realMode2 && otp_code === '9999';
        if (otp_code !== session.otp && !devBypass2) {
            return res.status(401).json({ error: 'Invalid OTP code' });
        }

        pendingPhoneVerifications.delete(transaction_token);
        res.json({ success: true, verified_phone: session.phone });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'OTP verification failed' });
    }
});

const pendingResets = new Map();

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { role, identifier } = req.body;
        if (!role || !identifier) {
            return res.status(400).json({ error: 'Role and identifier are required' });
        }

        if (role !== 'candidate' && role !== 'employer' && role !== 'admin') {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const [settingsRows] = await db.query('SELECT country_phone_code FROM site_settings WHERE id = 1');
        const countryPhoneCode = settingsRows[0]?.country_phone_code || '91';

        let query;
        let params = [];
        
        if (role === 'admin') {
            if (identifier.includes('@')) {
                query = 'SELECT * FROM users WHERE role = ? AND email = ? AND is_deleted_by_admin = 0';
                params = ['admin', identifier.trim().toLowerCase()];
            } else {
                query = 'SELECT * FROM users WHERE role = ? AND (';
                params = ['admin'];
                const possiblePhones = getPossiblePhoneNumbers(identifier, countryPhoneCode);
                if (possiblePhones.length > 0) {
                    query += 'phone IN (' + possiblePhones.map(() => '?').join(', ') + ')';
                    params.push(...possiblePhones);
                } else {
                    query += 'phone = ?';
                    params.push(identifier);
                }
                query += ') AND is_deleted_by_admin = 0';
            }
        } else {
            query = 'SELECT * FROM users WHERE role = ? AND (';
            params = [role];
            const possiblePhones = getPossiblePhoneNumbers(identifier, countryPhoneCode);
            if (possiblePhones.length > 0) {
                query += 'phone IN (' + possiblePhones.map(() => '?').join(', ') + ')';
                params.push(...possiblePhones);
            } else {
                query += 'phone = ?';
                params.push(identifier);
            }
            query += ') AND is_deleted_by_admin = 0';
        }

        const [rows] = await db.query(query, params);
        if (rows.length === 0) {
            return res.status(400).json({ error: 'No registered account found with that information.' });
        }

        const user = rows[0];
        const transactionToken = Math.random().toString(36).substring(2, 15);
        
        let otpCode = '9999';
        let otpSent = false;
        let otpSentMethod = 'local';

        // If it's an admin, we try sending OTP via SMTP email if enabled
        if (role === 'admin' && user.email) {
            const [smtpSettings] = await db.query('SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_sender, smtp_secure, smtp_enabled FROM site_settings WHERE id = 1');
            const smtpConfig = smtpSettings && smtpSettings[0];
            
            if (smtpConfig && smtpConfig.smtp_enabled === 1 && smtpConfig.smtp_host && smtpConfig.smtp_user && smtpConfig.smtp_pass) {
                otpCode = Math.floor(1000 + Math.random() * 9000).toString();
                const emailSubject = 'Job Connect Admin Password Reset Verification Code';
                const emailText = `Your Job Connect OTP for Password Reset is: ${otpCode}. Valid for 5 minutes.`;
                const sent = await sendSmtpEmail(user.email, emailSubject, emailText);
                if (sent) {
                    otpSent = true;
                    otpSentMethod = 'email';
                }
            }
        }

        if (!otpSent) {
            // Fall back to Twilio SMS or mock OTP
            const userMobile = user.phone;
            const otpResult = await generateAndSendOtp(userMobile, 'Password Reset');
            otpCode = otpResult.otpCode;
            otpSent = otpResult.sent;
            otpSentMethod = otpResult.sent ? 'twilio' : 'local';
        }

        pendingResets.set(transactionToken, {
            userId: user.id,
            otp: otpCode,
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        console.log(`Password reset OTP generated for user ${user.id} (${identifier}): ${otpCode} (Token: ${transactionToken}) [${otpSentMethod.toUpperCase()} Mode]`);

        let responseMessage = 'OTP generated (Dev Mode: 9999)';
        if (otpSentMethod === 'email') {
            responseMessage = 'OTP sent to your registered email address';
        } else if (otpSentMethod === 'twilio') {
            responseMessage = 'OTP sent to your registered mobile number';
        }

        res.json({
            otp_required: true,
            transaction_token: transactionToken,
            message: responseMessage
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Forgot password operation failed' });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { transaction_token, otp_code, new_password } = req.body;
        if (!transaction_token || !otp_code || !new_password) {
            return res.status(400).json({ error: 'Transaction token, OTP, and new password are required' });
        }

        const session = pendingResets.get(transaction_token);
        if (!session) {
            return res.status(400).json({ error: 'Invalid or expired session' });
        }

        if (session.expires < Date.now()) {
            pendingResets.delete(transaction_token);
            return res.status(400).json({ error: 'OTP has expired. Please try again.' });
        }

        const realMode3 = await isRealModeActive();
        const devBypass3 = !realMode3 && otp_code === '9999';
        if (otp_code !== session.otp && !devBypass3) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        const userId = session.userId;
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [new_password, userId]);
        pendingResets.delete(transaction_token);

        res.json({
            success: true,
            message: 'Password has been reset successfully. Please login with your new password.'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT name, email, phone, company_name, address, google_map_link, gst_number, is_gst_verified, role, is_verified, is_approved, payment_status, license_image_url, dob FROM users WHERE id = ? AND is_deleted_by_admin = 0', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Profile fetch failed' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, company_name, address, google_map_link, gst_number, dob } = req.body;
        
        // Validation: check for duplicate phone number
        if (phone) {
            const [existingPhone] = await db.query('SELECT id FROM users WHERE phone = ? AND id != ? AND is_deleted_by_admin = 0', [phone, id]);
            if (existingPhone.length > 0) {
                return res.status(400).json({ error: 'This mobile number is already registered by another account.' });
            }
        }

        // Validation: check for duplicate email address
        if (email) {
            const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ? AND id != ? AND is_deleted_by_admin = 0', [email, id]);
            if (existingEmail.length > 0) {
                return res.status(400).json({ error: 'This email address is already registered by another account.' });
            }
        }

        const [oldUser] = await db.query('SELECT gst_number, company_name FROM users WHERE id = ?', [id]);
        let resetVerification = false;
        let finalGstNumber = gst_number;
        
        if (oldUser.length > 0) {
            // Check if business name has changed
            if (oldUser[0].company_name !== company_name) {
                resetVerification = true;
                finalGstNumber = null; // Clear the GST number completely!
            } else if (oldUser[0].gst_number !== gst_number && oldUser[0].gst_number !== (gst_number || null)) {
                resetVerification = true;
            }
        }

        let updateQuery = 'UPDATE users SET name = ?, email = ?, phone = ?, company_name = ?, address = ?, google_map_link = ?, gst_number = ?';
        let queryParams = [name, email || null, phone || null, company_name || null, address || null, google_map_link || null, finalGstNumber || null];

        if (dob !== undefined) {
            updateQuery += ', dob = ?';
            queryParams.push(dob || null);
        }

        if (resetVerification) {
            updateQuery += ', is_gst_verified = 0, is_verified = 0';
        }
        updateQuery += ' WHERE id = ?';
        queryParams.push(id);

        await db.execute(updateQuery, queryParams);
        
        res.json({ 
            success: true, 
            message: 'Profile updated successfully', 
            resetVerification, 
            clearedGst: finalGstNumber === null 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Profile update failed' });
    }
});

app.put('/api/users/:id/verify-gst', async (req, res) => {
    try {
        const { id } = req.params;
        const { gst_number } = req.body;
        
        if (!gst_number) {
            return res.status(400).json({ error: 'GST Number is required' });
        }
        
        function verifyGSTChecksum(gstin) {
            if (gstin.length !== 15) return false;
            const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            let sum = 0;
            for (let i = 0; i < 14; i++) {
                let value = chars.indexOf(gstin[i]);
                if (value === -1) return false;
                let factor = (i % 2 === 0) ? 1 : 2;
                let product = value * factor;
                sum += Math.floor(product / 36) + (product % 36);
            }
            let checksum = (36 - (sum % 36)) % 36;
            return chars[checksum] === gstin[14];
        }

        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
        if (!gstRegex.test(gst_number) || !verifyGSTChecksum(gst_number.toUpperCase())) {
            return res.status(400).json({ error: 'Invalid GST Number. Please provide a genuine GSTIN.' });
        }

        // Just save to the DB as pending (is_gst_verified = 0, is_verified = 0)
        await db.execute('UPDATE users SET gst_number = ?, is_gst_verified = 0, is_verified = 0 WHERE id = ? AND role = "employer"', [gst_number.toUpperCase(), id]);
        res.json({ success: true, message: 'GST Number submitted successfully. Pending Admin verification.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'GST submission failed' });
    }
});

app.get('/api/users/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT is_verified, is_approved, payment_status FROM users WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Status fetch failed' });
    }
});

app.put('/api/users/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        const [users] = await db.query('SELECT password FROM users WHERE id = ?', [id]);
        
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        if (users[0].password !== currentPassword) return res.status(400).json({ error: 'Incorrect current password' });
        
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [newPassword, id]);
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Password update failed' });
    }
});

// 3. Payment simulation
app.post('/api/employers/payment', async (req, res) => {
    try {
        const { employer_id } = req.body;
        // Simulate payment success and update status
        await db.execute('UPDATE users SET payment_status = "paid" WHERE id = ? AND role = "employer"', [employer_id]);
        
        const [settings] = await db.query('SELECT currency_code FROM site_settings WHERE id = 1');
        const currencyCode = settings[0]?.currency_code || 'INR';
        const currencySymbol = getCurrencySymbol(currencyCode);
        
        res.json({ success: true, message: `Payment successful, registration fee (${currencySymbol}100) paid.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Payment failed' });
    }
});





// Location Management
app.get('/api/locations', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT l.*, p.name AS parent_name 
            FROM locations l 
            LEFT JOIN locations p ON l.parent_id = p.id 
            ORDER BY COALESCE(p.name, l.name), l.parent_id IS NOT NULL, l.name
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});

app.post('/api/admin/locations', async (req, res) => {
    try {
        const { name, parent_id } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        const parentVal = parent_id ? parseInt(parent_id) : null;
        
        if (name.includes(',')) {
            const subPlaces = name.split(',').map(s => s.trim()).filter(s => s.length > 0);
            let addedCount = 0;
            for (const sub of subPlaces) {
                const [result] = await db.execute('INSERT IGNORE INTO locations (name, parent_id) VALUES (?, ?)', [sub, parentVal]);
                if (result.affectedRows > 0) {
                    addedCount++;
                }
            }
            res.json({ success: true, message: `${addedCount} locations added successfully` });
        } else {
            const [result] = await db.execute('INSERT IGNORE INTO locations (name, parent_id) VALUES (?, ?)', [name.trim(), parentVal]);
            if (result.affectedRows === 0) {
                return res.status(400).json({ error: `Location "${name.trim()}" already exists` });
            }
            res.json({ success: true, message: 'Location added successfully' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add location' });
    }
});

app.delete('/api/admin/locations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM locations WHERE id = ?', [id]);
        res.json({ success: true, message: 'Location deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete location' });
    }
});

app.delete('/api/admin/locations/clear-subplaces/:parentId', async (req, res) => {
    try {
        const { parentId } = req.params;
        await db.execute('DELETE FROM locations WHERE parent_id = ?', [parentId]);
        res.json({ success: true, message: 'All sub-places cleared successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to clear sub-places' });
    }
});

// Admin Stats and Management
const licenseStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.resolve(__dirname, '../client/public/logos');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, 'license_' + req.params.id + '_' + Date.now() + path.extname(file.originalname));
    }
});
const uploadLicense = multer({ storage: licenseStorage });

app.post('/api/employers/:id/upload-license-image', uploadLicense.single('license_image'), async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
        
        const imageUrl = `/logos/${req.file.filename}`;
        await db.execute('UPDATE users SET license_image_url = ?, is_verified = 0 WHERE id = ?', [imageUrl, id]);
        
        res.json({ success: true, imageUrl, message: 'License uploaded successfully. Pending admin verification.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to upload license image' });
    }
});

app.get('/api/admin/employers', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, name, email, phone, role, company_name, address, google_map_link, is_verified, is_approved, payment_status, license_image_url, is_gst_verified, gst_number FROM users WHERE role = "employer" AND is_deleted_by_admin = 0 ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Admin fetch failed' });
    }
});

app.put('/api/admin/approve/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_approved } = req.body;
        await db.execute('UPDATE users SET is_approved = ? WHERE id = ? AND role = "employer"', [is_approved, id]);
        const [rows] = await db.execute('SELECT company_name FROM users WHERE id = ?', [id]);
        const label = rows[0]?.company_name || `Employer #${id}`;
        logActivity(req, is_approved ? 'APPROVED_EMPLOYER' : 'REJECTED_EMPLOYER', 'employer', id, label);
        res.json({ success: true, message: 'Approval status updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
});

app.put('/api/admin/verify/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_verified } = req.body;
        const [users] = await db.query('SELECT gst_number, company_name FROM users WHERE id = ?', [id]);
        const gst_number = users.length > 0 ? users[0].gst_number : null;
        const label = users[0]?.company_name || `Employer #${id}`;
        await db.execute(
            'UPDATE users SET is_verified = ?, is_gst_verified = ? WHERE id = ? AND role = "employer"',
            [is_verified ? 1 : 0, is_verified && gst_number ? 1 : 0, id]
        );
        logActivity(req, is_verified ? 'VERIFIED_EMPLOYER' : 'UNVERIFIED_EMPLOYER', 'employer', id, label);
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
});

app.delete('/api/admin/employers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT id, email, phone, company_name FROM users WHERE id = ? AND role = "employer"', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Employer not found' });
        }
        const label = rows[0].company_name || rows[0].email || `Employer #${id}`;
        const uniqueEmail = rows[0].email ? `del_${rows[0].id}_${rows[0].email}`.slice(0, 100) : null;
        const uniquePhone = rows[0].phone ? `del_${rows[0].id}_${rows[0].phone}`.slice(0, 20) : null;
        await db.execute(
            'UPDATE users SET is_deleted_by_admin = 1, email = ?, phone = ? WHERE id = ?',
            [uniqueEmail, uniquePhone, id]
        );
        logActivity(req, 'DELETED_EMPLOYER', 'employer', id, label);
        res.json({ success: true, message: 'Employer registration deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Admin User Management (User Manager)
app.get('/api/admin/users', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, name, email, phone, role, permissions FROM users WHERE role = "admin" OR role = "staff" ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch admin users' });
    }
});

app.post('/api/admin/users', async (req, res) => {
    try {
        const { name, email, password, permissions, role } = req.body;
        const trimmedName = name ? name.trim() : '';
        if (!trimmedName) {
            return res.status(400).json({ error: 'Please enter a valid name.' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address with a domain name.' });
        }
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, role, permissions, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
            [trimmedName, email, password, role || 'admin', JSON.stringify(permissions || {}), true]
        );
        logActivity(req, 'CREATED_ADMIN_USER', 'admin_user', result.insertId, `${trimmedName} (${email})`);
        res.json({ id: result.insertId, message: 'Admin user created successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Email already exists' });
    }
});

app.put('/api/admin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, permissions, password, role } = req.body;
        const trimmedName = name ? name.trim() : '';
        if (!trimmedName) {
            return res.status(400).json({ error: 'Please enter a valid name.' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address with a domain name.' });
        }
        let query = 'UPDATE users SET name = ?, email = ?, permissions = ?, role = ?';
        const params = [trimmedName, email, JSON.stringify(permissions), role || 'admin'];
        if (password) {
            query += ', password = ?';
            params.push(password);
        }
        query += ' WHERE id = ?';
        params.push(id);
        await db.execute(query, params);
        logActivity(req, 'UPDATED_ADMIN_USER', 'admin_user', id, `${trimmedName} (${email})`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [user] = await db.execute('SELECT email, name FROM users WHERE id = ?', [id]);
        if (user[0]?.email === 'admin@jobconnect.gov.in') return res.status(403).json({ error: 'Cannot delete Super Admin' });
        const label = user[0] ? `${user[0].name} (${user[0].email})` : `Admin #${id}`;
        await db.execute('DELETE FROM users WHERE id = ?', [id]);
        logActivity(req, 'DELETED_ADMIN_USER', 'admin_user', id, label);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Activity Log — Super Admin Only
app.get('/api/admin/activity-log', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = (page - 1) * limit;
        const [rows] = await db.query(
            'SELECT * FROM admin_activity_log ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );
        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM admin_activity_log');
        res.json({ logs: rows, total, totalPages: Math.ceil(total / limit), currentPage: page });
    } catch (err) {
        console.error('Activity log fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch activity log' });
    }
});
// CSR Partners Management
app.get('/api/csr-partners', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM csr_partners ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch CSR partners' });
    }
});

app.post('/api/admin/csr-partners', async (req, res) => {
    try {
        const { name, logo_url } = req.body;
        console.log('Adding CSR Partner:', { name, logo_url });
        const [result] = await db.execute(
            'INSERT INTO csr_partners (name, logo_url) VALUES (?, ?)',
            [name, logo_url]
        );
        res.json({ id: result.insertId, success: true });
    } catch (err) {
        console.error('ADD PARTNER ERROR:', err);
        res.status(500).json({ error: `Failed to add partner: ${err.message}` });
    }
});

// CSR Partner Upload (Moved to top of CSR block for matching priority)
app.post('/api/admin/csr-partners/upload', upload.single('csr_logo'), (req, res) => {
    try {
        console.log('--- CSR UPLOAD REQUEST RECEIVED ---');
        if (!req.file) {
            console.log('Upload error: No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log('Upload success:', req.file.filename);
        const logoUrl = `/logos/${req.file.filename}`;
        res.json({ url: logoUrl });
    } catch (err) {
        console.error('SERVER UPLOAD ERROR:', err);
        res.status(500).json({ error: 'Internal server error during upload' });
    }
});

app.put('/api/admin/csr-partners/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, logo_url } = req.body;
        console.log('Updating CSR Partner:', { id, name, logo_url });
        await db.execute(
            'UPDATE csr_partners SET name = ?, logo_url = ? WHERE id = ?',
            [name, logo_url, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('UPDATE PARTNER ERROR:', err);
        res.status(500).json({ error: `Update failed: ${err.message}` });
    }
});

app.delete('/api/admin/csr-partners/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM csr_partners WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Site Settings
app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM site_settings WHERE id = 1');
        res.json(rows[0] || {});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Dynamic Manifest for PWA
app.get('/api/manifest.json', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT app_name, app_icon_url FROM site_settings WHERE id = 1');
        const settings = rows[0] || { app_name: 'JobConnect', app_icon_url: '/logos/app_icon.png' };
        
        const manifest = {
            "short_name": settings.app_name,
            "name": `${settings.app_name} - Job Portal`,
            "icons": [
                {
                    "src": settings.app_icon_url,
                    "sizes": "192x192",
                    "type": "image/png",
                    "purpose": "any"
                },
                {
                    "src": settings.app_icon_url,
                    "sizes": "512x512",
                    "type": "image/png",
                    "purpose": "any maskable"
                }
            ],
            "start_url": "/",
            "display": "standalone",
            "theme_color": "#2563eb",
            "background_color": "#ffffff"
        };
        res.header('Content-Type', 'application/manifest+json');
        res.json(manifest);
    } catch (err) {
        res.status(500).json({ error: 'Manifest generation failed' });
    }
});

function getCurrencySymbol(code) {
    switch (code) {
        case 'INR': return '₹';
        case 'AED': return 'AED ';
        case 'USD': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        default: return code ? code + ' ' : '';
    }
}

async function handleSettingsUpdate(req, res) {
    try {
        const s = req.body;
        if (!s || Object.keys(s).length === 0) return res.status(400).json({ error: 'No data provided' });

        const sql = `
            UPDATE site_settings SET 
            banner_title = ?, banner_subtitle = ?, 
            box1_title = ?, box1_text = ?, 
            box2_title = ?, box2_text = ?, 
            box3_title = ?, box3_text = ?,
            app_name = ?, app_icon_url = ?,
            header_logo_url = ?, csr_partners_content = ?,
            csr_home_title = ?, csr_home_subtitle = ?,
            csr_page_title = ?, csr_page_subtitle = ?,
            pdf_footer_text = ?,
            initiative_logo_url = ?, powered_logo_url = ?,
            gst_domains = ?, trade_license_domains = ?,
            job_id_prefix = ?,
            interview_rules = ?,
            twilio_sid = ?, twilio_auth_token = ?,
            twilio_phone_number = ?, twilio_enabled = ?,
            currency_code = ?, country_phone_code = ?,
            smtp_host = ?, smtp_port = ?,
            smtp_user = ?, smtp_pass = ?,
            smtp_sender = ?, smtp_secure = ?,
            smtp_enabled = ?
            WHERE id = 1
        `;
        const params = [
            s.banner_title || '', 
            s.banner_subtitle || '', 
            s.box1_title || '', 
            s.box1_text || '', 
            s.box2_title || '', 
            s.box2_text || '', 
            s.box3_title || '', 
            s.box3_text || '',
            s.app_name || 'JobConnect',
            s.app_icon_url || '/logos/app_icon.png',
            s.header_logo_url || '',
            s.csr_partners_content || '',
            s.csr_home_title || 'CSR Funding & Support',
            s.csr_home_subtitle || 'Empowering the local workforce through strategic corporate partnerships and community development initiatives.',
            s.csr_page_title || 'CSR Partners',
            s.csr_page_subtitle || 'Recognizing the organizations that empower our local workforce and drive community growth.',
            s.pdf_footer_text || 'JobConnect by Local Authority. Powered by eglobe IT Solutions.',
            s.initiative_logo_url || '',
            s.powered_logo_url || '',
            s.gst_domains || '',
            s.trade_license_domains || '',
            s.job_id_prefix || 'JC',
            s.interview_rules || '',
            s.twilio_sid || null,
            s.twilio_auth_token || null,
            s.twilio_phone_number || null,
            s.twilio_enabled !== undefined ? (s.twilio_enabled ? 1 : 0) : 0,
            s.currency_code || 'INR',
            s.country_phone_code || '91',
            s.smtp_host || '',
            s.smtp_port ? parseInt(s.smtp_port) : null,
            s.smtp_user || '',
            s.smtp_pass || '',
            s.smtp_sender || '',
            s.smtp_secure !== undefined ? (s.smtp_secure ? 1 : 0) : 0,
            s.smtp_enabled !== undefined ? (s.smtp_enabled ? 1 : 0) : 0
        ];

        await db.execute(sql, params);
        res.json({ success: true, message: 'Settings updated' });
    } catch (err) {
        console.error('Settings Update Error:', err);
        res.status(500).json({ error: 'Database Update Failed' });
    }
}

app.post('/api/branding-config', handleSettingsUpdate);

app.post('/api/admin/test-smtp', async (req, res) => {
    try {
        const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_sender, smtp_secure, test_email } = req.body;
        
        if (!smtp_host || !smtp_user || !smtp_pass || !test_email) {
            return res.status(400).json({ error: 'SMTP host, user, password, and test recipient email are required' });
        }

        const [settingsRows] = await db.query('SELECT app_name, header_logo_url FROM site_settings WHERE id = 1');
        const siteConfig = settingsRows && settingsRows[0];
        const appName = siteConfig?.app_name || 'Job Connect';
        const logoUrl = siteConfig?.header_logo_url || '';

        const subject = 'Job Connect - SMTP Connection Test';
        const textContent = 'Hello! This is a test email sent from Job Connect to verify your SMTP configuration. If you received this, your SMTP settings are working perfectly!';
        const htmlBody = generateEmailHtml(appName, logoUrl, subject, textContent);

        const transporter = nodemailer.createTransport({
            host: smtp_host,
            port: smtp_port ? parseInt(smtp_port) : 587,
            secure: smtp_secure === 1 || smtp_secure === true,
            auth: {
                user: smtp_user,
                pass: smtp_pass
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: smtp_sender || smtp_user,
            to: test_email,
            subject,
            text: textContent,
            html: htmlBody
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Test email sent successfully!' });
    } catch (err) {
        console.error('SMTP test connection failed:', err);
        res.status(500).json({ error: `SMTP Connection test failed: ${err.message}` });
    }
});

// CMS Pages
app.get('/api/pages', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, title, slug, is_active FROM cms_pages WHERE is_active = 1');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch pages' });
    }
});

app.get('/api/pages/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const [rows] = await db.query('SELECT * FROM cms_pages WHERE slug = ? AND is_active = 1', [slug]);
        if (rows.length === 0) return res.status(404).json({ error: 'Page not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch page' });
    }
});

app.get('/api/admin/pages', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM cms_pages ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch pages' });
    }
});

app.post('/api/admin/pages', async (req, res) => {
    try {
        const { title, slug, content, is_active } = req.body;
        const trimmedTitle = title ? title.trim() : '';
        const trimmedSlug = slug ? slug.trim() : '';
        const trimmedContent = content ? content.trim() : '';

        if (!trimmedTitle || !trimmedSlug || !trimmedContent) {
            return res.status(400).json({ error: 'Title, slug, and content are required and cannot be empty.' });
        }

        await db.query('INSERT INTO cms_pages (title, slug, content, is_active) VALUES (?, ?, ?, ?)', [trimmedTitle, trimmedSlug, trimmedContent, is_active]);
        res.json({ success: true, message: 'Page created' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create page' });
    }
});

app.put('/api/admin/pages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, slug, content, is_active } = req.body;
        const trimmedTitle = title ? title.trim() : '';
        const trimmedSlug = slug ? slug.trim() : '';
        const trimmedContent = content ? content.trim() : '';

        if (!trimmedTitle || !trimmedSlug || !trimmedContent) {
            return res.status(400).json({ error: 'Title, slug, and content are required and cannot be empty.' });
        }

        await db.query('UPDATE cms_pages SET title = ?, slug = ?, content = ?, is_active = ? WHERE id = ?', [trimmedTitle, trimmedSlug, trimmedContent, is_active, id]);
        res.json({ success: true, message: 'Page updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update page' });
    }
});

app.delete('/api/admin/pages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM cms_pages WHERE id = ?', [id]);
        res.json({ success: true, message: 'Page deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete page' });
    }
});

// Testimonials Management
app.get('/api/testimonials', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM testimonials ORDER BY priority ASC, created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
});

app.post('/api/admin/testimonials', async (req, res) => {
    try {
        const { name, designation, message, image_url } = req.body;
        if (message && message.length > 250) {
            return res.status(400).json({ error: 'Message cannot exceed 250 characters' });
        }
        await db.query('INSERT INTO testimonials (name, designation, message, image_url) VALUES (?, ?, ?, ?)', [name, designation, message, image_url || '']);
        res.json({ success: true, message: 'Testimonial added' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add testimonial' });
    }
});

app.put('/api/admin/testimonials/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, designation, message, image_url } = req.body;
        if (message && message.length > 250) {
            return res.status(400).json({ error: 'Message cannot exceed 250 characters' });
        }
        await db.query('UPDATE testimonials SET name = ?, designation = ?, message = ?, image_url = ? WHERE id = ?', [name, designation, message, image_url, id]);
        res.json({ success: true, message: 'Testimonial updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update testimonial' });
    }
});

app.post('/api/admin/testimonials/reorder', async (req, res) => {
    try {
        const { orders } = req.body; // Array of {id, priority}
        if (!Array.isArray(orders)) return res.status(400).json({ error: 'Invalid data' });

        for (const item of orders) {
            await db.query('UPDATE testimonials SET priority = ? WHERE id = ?', [item.priority, item.id]);
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reorder' });
    }
});

app.delete('/api/admin/testimonials/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM testimonials WHERE id = ?', [id]);
        res.json({ success: true, message: 'Testimonial deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete testimonial' });
    }
});

// 404 Catch-all
app.use((req, res) => {
    console.log(`404 NOT FOUND: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Route not found: ${req.url}` });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
