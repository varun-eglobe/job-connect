const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://127.0.0.1:5002/api/employers');
        const homies = res.data.find(c => c.id === 35 || c.company_name === 'Homies kitchen');
        console.log("Homies kitchen data returned by server API:", homies);
    } catch (err) {
        console.error("API call failed", err.message);
    }
}
test();
