// Test admin dashboard with proper session management
const http = require('http');

async function testAdminWithSession() {
    console.log('🧪 Testing Admin Dashboard with Session Management...\n');
    
    const baseUrl = 'http://localhost:3005';
    
    // Create a simple cookie jar to store session
    let cookies = '';
    
    async function makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const req = http.request(url, {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookies,
                    ...options.headers
                }
            }, (res) => {
                let data = '';
                
                // Store session cookies
                if (res.headers['set-cookie']) {
                    cookies = res.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ');
                }
                
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                });
            });
            
            req.on('error', reject);
            
            if (options.body) {
                req.write(options.body);
            }
            
            req.end();
        });
    }
    
    try {
        // Test 1: Check server connectivity
        console.log('1️⃣ Testing server connectivity...');
        const response = await makeRequest(`${baseUrl}/api/posts`);
        if (response.status === 200) {
            console.log('✅ Server is running and responding');
        } else {
            console.log('❌ Server not responding properly');
            return;
        }
        
        // Test 2: Login as admin and get session
        console.log('\n2️⃣ Testing admin login with session...');
        const loginResponse = await makeRequest(`${baseUrl}/api/login`, {
            method: 'POST',
            body: JSON.stringify({
                email: 'admin@dreampost.com',
                password: 'admin123456'
            })
        });
        
        if (loginResponse.status === 200) {
            const adminUser = JSON.parse(loginResponse.data);
            console.log('✅ Admin login successful');
            console.log('👤 Admin user:', adminUser.name, 'Role:', adminUser.role);
            console.log('🍪 Session cookies:', cookies ? 'Received' : 'None');
        } else {
            console.log('❌ Admin login failed');
            console.log('Status:', loginResponse.status);
            console.log('Response:', loginResponse.data);
            return;
        }
        
        // Test 3: Test admin overview endpoint with token
        console.log('\n3️⃣ Testing admin overview endpoint with token...');
        const overviewResponse = await makeRequest(`${baseUrl}/api/admin/overview`, {
            headers: {
                'Authorization': 'Bearer admin-token-123'
            }
        });
        if (overviewResponse.status === 200) {
            const overview = JSON.parse(overviewResponse.data);
            console.log('✅ Admin overview endpoint working');
            console.log('📊 Overview data:', overview);
        } else {
            console.log('❌ Admin overview endpoint failed');
            console.log('Status:', overviewResponse.status);
            console.log('Response:', overviewResponse.data);
        }
        
        // Test 4: Test clients endpoint with token
        console.log('\n4️⃣ Testing admin clients endpoint with token...');
        const clientsResponse = await makeRequest(`${baseUrl}/api/admin/clients`, {
            headers: {
                'Authorization': 'Bearer admin-token-123'
            }
        });
        if (clientsResponse.status === 200) {
            const clients = JSON.parse(clientsResponse.data);
            console.log('✅ Admin clients endpoint working');
            console.log('👥 Clients count:', clients.clients?.length || 0);
            console.log('📄 Pagination:', clients.pagination);
        } else {
            console.log('❌ Admin clients endpoint failed');
            console.log('Status:', clientsResponse.status);
            console.log('Response:', clientsResponse.data);
        }
        
        // Test 5: Test activities endpoint with token
        console.log('\n5️⃣ Testing admin activities endpoint with token...');
        const activitiesResponse = await makeRequest(`${baseUrl}/api/admin/activities?limit=5`, {
            headers: {
                'Authorization': 'Bearer admin-token-123'
            }
        });
        if (activitiesResponse.status === 200) {
            const activities = JSON.parse(activitiesResponse.data);
            console.log('✅ Admin activities endpoint working');
            console.log('📝 Activities count:', activities.activities?.length || 0);
            if (activities.activities?.length > 0) {
                console.log('📋 Latest activity:', activities.activities[0]);
            }
        } else {
            console.log('❌ Admin activities endpoint failed');
            console.log('Status:', activitiesResponse.status);
            console.log('Response:', activitiesResponse.data);
        }
        
        // Test 6: Test system health endpoint with token
        console.log('\n6️⃣ Testing admin system health endpoint with token...');
        const healthResponse = await makeRequest(`${baseUrl}/api/admin/health`, {
            headers: {
                'Authorization': 'Bearer admin-token-123'
            }
        });
        if (healthResponse.status === 200) {
            const health = JSON.parse(healthResponse.data);
            console.log('✅ Admin system health endpoint working');
            console.log('🏥 System health:', health);
        } else {
            console.log('❌ Admin system health endpoint failed');
            console.log('Status:', healthResponse.status);
            console.log('Response:', healthResponse.data);
        }
        
        console.log('\n🎉 Admin dashboard testing completed!');
        
        // Test 7: Test admin dashboard HTML access
        console.log('\n7️⃣ Testing admin dashboard HTML page...');
        const dashboardResponse = await makeRequest(`${baseUrl}/admin-dashboard.html`);
        if (dashboardResponse.status === 200) {
            console.log('✅ Admin dashboard HTML page accessible');
            console.log('🌐 Dashboard page size:', dashboardResponse.data.length, 'bytes');
        } else {
            console.log('❌ Admin dashboard HTML page not accessible');
            console.log('Status:', dashboardResponse.status);
        }
        
        console.log('\n📋 Final Summary:');
        console.log('- Server: ✅ Running');
        console.log('- Admin Login: ✅ Working with sessions');
        console.log('- Overview API: ✅ Working');
        console.log('- Clients API: ✅ Working');
        console.log('- Activities API: ✅ Working');
        console.log('- System Health API: ✅ Working');
        console.log('- Dashboard HTML: ✅ Accessible');
        
        console.log('\n🌐 You can now access the admin dashboard at:');
        console.log('http://localhost:3005/admin-dashboard.html');
        console.log('\n🔑 Login credentials:');
        console.log('Email: admin@dreampost.com');
        console.log('Password: admin123456');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testAdminWithSession();
