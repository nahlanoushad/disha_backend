import http from 'http';

const request = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
};

const runTests = async () => {
  try {
    console.log('Testing GET /api/categories...');
    const getRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/categories',
      method: 'GET'
    });
    console.log('GET Categories Status:', getRes.status);
    console.log('Total Categories:', getRes.data.results);
    
    const catId = getRes.data.data.categories[0]._id;
    
    console.log(`\nTesting GET /api/categories/${catId}...`);
    const getByIdRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/categories/${catId}`,
      method: 'GET'
    });
    console.log('GET Category By ID Status:', getByIdRes.status);
    console.log('Category Name:', getByIdRes.data.data.category.name);

    console.log('\nTesting POST /api/categories (Unauthenticated)...');
    const postRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/categories',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ name: 'Test', description: 'Test' }));
    console.log('POST Unauth Status:', postRes.status);
    console.log('POST Unauth Message:', postRes.data.message);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

setTimeout(runTests, 1500); // Give server a moment to start
