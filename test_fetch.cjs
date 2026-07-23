const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/state',
  method: 'GET',
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Segments count:', parsed.segments?.length);
      console.log('Companies:', parsed.companies?.map(c => ({ id: c.id, name: c.name, segment: c.segment })));
    } catch (e) {
      console.log('Error parsing JSON:', data.substring(0, 100));
    }
  });
});
req.end();
