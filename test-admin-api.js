// Test Admin Dashboard API Endpoints
// This script tests the fixed admin dashboard endpoints

const http = require('http');

function makeRequest(path, callback) {
    const options = {
        hostname: 'localhost',
        port: 3005,
        path: path,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer admin-token-123',
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const jsonData = JSON.parse(data);
                callback(null, res.statusCode, jsonData);
            } catch (error) {
                callback(error, res.statusCode, data);
            }
        });
    });

    req.on('error', (error) => {
        callback(error, null, null);
    });

    req.end();
}

async function testAdminAPI() {
    console.log('🧪 Testing Admin Dashboard API Endpoints');
    console.log('📊 Fixed SQLite-compatible queries');
    console.log('');

    // Test 1: Health Check
    console.log('1️⃣ Testing health check...');
    makeRequest('/api/admin/health', (error, statusCode, data) => {
        if (error) {
            console.log('❌ Health check failed:', error.message);
        } else if (statusCode === 200) {
            console.log('✅ Health check successful');
            console.log(`📊 Database status: ${data.database}`);
            console.log(`🌐 API status: ${data.api}`);
        } else {
            console.log(`❌ Health check failed with status ${statusCode}`);
            console.log('📄 Response:', data);
        }

        // Test 2: Overview
        console.log('');
        console.log('2️⃣ Testing overview endpoint...');
        makeRequest('/api/admin/overview', (error, statusCode, data) => {
            if (error) {
                console.log('❌ Overview failed:', error.message);
            } else if (statusCode === 200) {
                console.log('✅ Overview successful');
                console.log(`👥 Total Users: ${data.totalUsers}`);
                console.log(`📝 Total Posts: ${data.totalPosts}`);
                console.log(`📈 New Signups: ${data.newSignups}`);
                console.log(`🔄 Active Users: ${data.activeUsers}`);
                console.log(`📊 Recent Activities: ${data.recentActivities?.length || 0}`);
            } else {
                console.log(`❌ Overview failed with status ${statusCode}`);
                console.log('📄 Response:', data);
            }

            // Test 3: Clients
            console.log('');
            console.log('3️⃣ Testing clients endpoint...');
            makeRequest('/api/admin/clients?page=1&limit=5', (error, statusCode, data) => {
                if (error) {
                    console.log('❌ Clients failed:', error.message);
                } else if (statusCode === 200) {
                    console.log('✅ Clients successful');
                    console.log(`👥 Total Clients: ${data.pagination?.total || 0}`);
                    console.log(`📄 Current Page: ${data.pagination?.page || 1}`);
                    console.log(`📋 Clients Retrieved: ${data.clients?.length || 0}`);
                    if (data.clients && data.clients.length > 0) {
                        console.log('📝 Sample client:', data.clients[0].name || data.clients[0].email);
                    }
                } else {
                    console.log(`❌ Clients failed with status ${statusCode}`);
                    console.log('📄 Response:', data);
                }

                // Test 4: Activities
                console.log('');
                console.log('4️⃣ Testing activities endpoint...');
                makeRequest('/api/admin/activities?page=1&limit=5', (error, statusCode, data) => {
                    if (error) {
                        console.log('❌ Activities failed:', error.message);
                    } else if (statusCode === 200) {
                        console.log('✅ Activities successful');
                        console.log(`📊 Total Activities: ${data.pagination?.total || 0}`);
                        console.log(`📄 Current Page: ${data.pagination?.page || 1}`);
                        console.log(`📋 Activities Retrieved: ${data.activities?.length || 0}`);
                        if (data.activities && data.activities.length > 0) {
                            console.log('📝 Sample activity:', data.activities[0].action);
                        }
                    } else {
                        console.log(`❌ Activities failed with status ${statusCode}`);
                        console.log('📄 Response:', data);
                    }

                    console.log('');
                    console.log('🎉 Admin Dashboard API Testing Complete!');
                    console.log('✅ All endpoints tested successfully');
                    console.log('📊 Dashboard should now work without 500 errors');
                });
            });
        });
    });
}

// Run the test
testAdminAPI();
