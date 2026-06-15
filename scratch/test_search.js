const cp = require('child_process');
const srv = cp.spawn('node', ['server.js'], { cwd: './server' });

srv.stdout.on('data', (d) => {
    const msg = d.toString();
    console.log('SRV:', msg);
    if (msg.includes('Server running')) {
        console.log('--- TRIGGERING SEARCH ---');
        cp.exec('node -e "const http = require(\'http\'); http.get(\'http://127.0.0.1:5002/api/jobs?search=Lulu\', (res) => { res.on(\'data\', (c) => console.log(\'CHUNK\', c.toString())); })"', (err, stdout, stderr) => {
            if (err) console.error('EXEC ERR', err);
            console.log('EXEC OUT', stdout);
            process.exit(0);
        });
    }
});

srv.stderr.on('data', (d) => console.error('SRV ERR:', d.toString()));
