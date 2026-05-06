// Test login with the existing users
const http = require('http');

console.log('🔑 Testing login with existing users...');

// Test login with user1
const loginData1 = {
    email: 'test@test.com',
    password: 'test123456'
};

const postData1 = JSON.stringify(loginData1);

const options1 = {
    hostname: 'localhost',
    port: 3005,
    path: '/api/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData1)
    }
};

const req1 = http.request(options1, (res) => {
    console.log(`📝 User1 login response: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log(`📝 User1 response: ${data}`);
        
        if (res.statusCode === 200) {
            console.log('✅ User1 login successful!');
        } else {
            console.log('❌ User1 login failed');
            
            // Try user2
            testUser2();
        }
    });
});

req1.on('error', (e) => {
    console.error('❌ Request error:', e.message);
});

function testUser2() {
    const loginData2 = {
        email: 'lamarkchristopher770@gmail.com',
        password: 'password123'
    };

    const postData2 = JSON.stringify(loginData2);

    const options2 = {
        hostname: 'localhost',
        port: 3005,
        path: '/api/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData2)
        }
    };

    const req2 = http.request(options2, (res) => {
        console.log(`📝 User2 login response: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log(`📝 User2 response: ${data}`);
            
            if (res.statusCode === 200) {
                console.log('✅ User2 login successful!');
            } else {
                console.log('❌ User2 login failed');
                console.log('💡 Need to create new user or check password hashes');
            }
        });
    });

    req2.write(postData2);
    req2.end();
}

req1.write(postData1);
req1.end();
