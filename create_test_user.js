// Create a test user with known credentials
const http = require('http');

console.log('👤 Creating test user with known credentials...');

const userData = {
    name: 'Test User',
    email: 'test@test.com',
    password: 'test123456'
};

const postData = JSON.stringify(userData);

const options = {
    hostname: 'localhost',
    port: 3005,
    path: '/api/signup',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(`📝 Registration response: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log(`📝 Registration response: ${data}`);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('✅ Test user created successfully!');
            console.log('🔑 Login Credentials:');
            console.log('  Email: test@test.com');
            console.log('  Password: test123');
        } else {
            console.log('❌ Failed to create test user');
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
