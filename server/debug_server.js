const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('DEBUG OK'));
const server = app.listen(5002, () => {
    console.log('DEBUG SERVER ON 5002');
});

// Prevent immediate exit
process.stdin.resume();
