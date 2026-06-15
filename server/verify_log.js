const axios = require('axios');

async function testApi() {
  try {
    const res = await axios.get('http://127.0.0.1:5002/api/jobs');
    const jobs = res.data.jobs;
    console.log('Total jobs fetched:', jobs.length);
    jobs.forEach(j => {
      console.log(`Job ID: ${j.id}, Employer: ${j.company_name}, is_verified: ${j.is_verified} (type: ${typeof j.is_verified}), is_gst_verified: ${j.is_gst_verified} (type: ${typeof j.is_gst_verified})`);
    });
  } catch (err) {
    console.error('API Error:', err.message);
  }
}

testApi();
