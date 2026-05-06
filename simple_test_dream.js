// Simple test to debug dream creation
const http = require('http');

console.log('🔍 Simple dream creation test...');

const dreamData = {
    text: "Simple test dream",
    mood: "Joyful",
    public: true,
    authorEmail: "test@example.com",
    authorName: "Test User"
};

console.log('📝 Sending dream data:', JSON.stringify(dreamData, null, 2));

const postData = JSON.stringify(dreamData);

const options = {
    hostname: 'localhost',
    port: 3005,
    path: '/api/posts',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(`📝 Response status: ${res.statusCode}`);
    console.log(`📝 Response headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
        console.log(`📝 Received chunk: ${chunk.length} bytes`);
    });
    
    res.on('end', () => {
        console.log(`📝 Complete response: ${data}`);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('✅ SUCCESS: Dream created!');
        } else {
            console.log('❌ FAILED: Dream creation failed');
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
