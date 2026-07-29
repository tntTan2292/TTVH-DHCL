const http = require('http');
const data = JSON.stringify({ username: 'admin', password: 'admin' });
const options = {
  hostname: '127.0.0.1',
  port: 5050,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
};
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body.substring(0, 500));
  });
});
req.on('error', err => console.error('Error:', err.message));
req.write(data);
req.end();
