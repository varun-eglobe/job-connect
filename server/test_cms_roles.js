const axios = require('axios');
const db = require('./db');

const API_BASE = 'http://127.0.0.1:5002/api';

async function runTest() {
    console.log('--- STARTING CMS ROLE-BASED ACCESS CONTROL TESTS ---');
    const mockSlug = 'test-employer-only-page-' + Date.now();
    const mockPage = {
        title: 'Test Employer Documentation',
        slug: mockSlug,
        content: '<p>This is confidential employer training documentation.</p>',
        is_active: 1,
        target_role: 'employer'
    };

    let createdId = null;

    try {
        // 1. Insert directly into database so we can test the public and employer routes
        const [result] = await db.query(
            'INSERT INTO cms_pages (title, slug, content, is_active, target_role) VALUES (?, ?, ?, ?, ?)',
            [mockPage.title, mockPage.slug, mockPage.content, mockPage.is_active, mockPage.target_role]
        );
        createdId = result.insertId;
        console.log(`✓ Inserted mock page with ID ${createdId} and target_role = 'employer'`);

        // 2. Query public list: GET /api/pages (should specify role=public implicitly or explicitly)
        // Public list should NOT contain the employer page
        const publicRes = await axios.get(`${API_BASE}/pages`);
        const foundInPublic = publicRes.data.some(p => p.slug === mockSlug);
        if (foundInPublic) {
            throw new Error('FAIL: Employer-only page was leaked in the public pages list!');
        }
        console.log('✓ Verified: Employer-only page is excluded from the public pages list.');

        // 3. Query employer list: GET /api/pages?role=employer
        // Employer list SHOULD contain the employer page
        const employerListRes = await axios.get(`${API_BASE}/pages?role=employer`);
        const foundInEmployer = employerListRes.data.some(p => p.slug === mockSlug);
        if (!foundInEmployer) {
            throw new Error('FAIL: Employer-only page was NOT found in the employer list pages!');
        }
        console.log('✓ Verified: Employer-only page is listed in the employer list page query (?role=employer).');

        // 4. Query specific page as Candidate/Guest: GET /api/pages/:slug?role=candidate
        // Should return 403 Forbidden
        try {
            await axios.get(`${API_BASE}/pages/${mockSlug}?role=candidate`);
            throw new Error('FAIL: Candidate was allowed to read employer-only page!');
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log('✓ Verified: Candidate request to read employer-only page returned 403 Forbidden.');
            } else {
                throw new Error(`FAIL: Expected 403 Forbidden, but got: ${err.response?.status || err.message}`);
            }
        }

        // 5. Query specific page as Employer: GET /api/pages/:slug?role=employer
        // Should succeed and return the page content
        const pageRes = await axios.get(`${API_BASE}/pages/${mockSlug}?role=employer`);
        if (pageRes.data.title === mockPage.title && pageRes.data.content === mockPage.content) {
            console.log('✓ Verified: Employer request to read employer-only page succeeded and returned correct content.');
        } else {
            throw new Error('FAIL: Returned page content does not match!');
        }

        console.log('--- ALL CMS ROLE-BASED ACCESS CONTROL TESTS PASSED SUCCESSFULLY! ---');
    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
        process.exitCode = 1;
    } finally {
        if (createdId) {
            await db.query('DELETE FROM cms_pages WHERE id = ?', [createdId]);
            console.log('✓ Cleaned up database mock entries.');
        }
        // Release db pool connections if necessary
        process.exit();
    }
}

runTest();
