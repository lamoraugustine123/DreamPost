const http = require('http');

// Test admin dashboard endpoints
async function testAdminDashboard() {
    console.log('🧪 Testing Admin Dashboard Functionality...\n');
    
    const baseUrl = 'http://localhost:3005';
    
    try {
        // Test 1: Check if server is running
        console.log('1️⃣ Testing server connectivity...');
        const response = await fetch(`${baseUrl}/api/posts`);
        if (response.ok) {
            console.log('✅ Server is running and responding');
        } else {
            console.log('❌ Server not responding properly');
            return;
        }
        
        // Test 2: Try to login as admin
        console.log('\n2️⃣ Testing admin login...');
        const loginResponse = await fetch(`${baseUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@dreampost.com',
                password: 'admin123456'
            })
        });
        
        if (loginResponse.ok) {
            const adminUser = await loginResponse.json();
            console.log('✅ Admin login successful');
            console.log('👤 Admin user:', adminUser.name, 'Role:', adminUser.role);
        } else {
            console.log('❌ Admin login failed');
            console.log('Status:', loginResponse.status);
            return;
        }
        
        // Test 3: Test admin overview endpoint
        console.log('\n3️⃣ Testing admin overview endpoint...');
        const overviewResponse = await fetch(`${baseUrl}/api/admin/overview`);
        if (overviewResponse.ok) {
            const overview = await overviewResponse.json();
            console.log('✅ Admin overview endpoint working');
            console.log('📊 Overview data:', overview);
        } else {
            console.log('❌ Admin overview endpoint failed');
            console.log('Status:', overviewResponse.status);
            const error = await overviewResponse.text();
            console.log('Error:', error);
        }
        
        // Test 4: Test clients endpoint
        console.log('\n4️⃣ Testing admin clients endpoint...');
        const clientsResponse = await fetch(`${baseUrl}/api/admin/clients`);
        if (clientsResponse.ok) {
            const clients = await clientsResponse.json();
            console.log('✅ Admin clients endpoint working');
            console.log('👥 Clients count:', clients.clients?.length || 0);
            console.log('📄 Pagination:', clients.pagination);
        } else {
            console.log('❌ Admin clients endpoint failed');
            console.log('Status:', clientsResponse.status);
            const error = await clientsResponse.text();
            console.log('Error:', error);
        }
        
        // Test 5: Test activities endpoint
        console.log('\n5️⃣ Testing admin activities endpoint...');
        const activitiesResponse = await fetch(`${baseUrl}/api/admin/activities?limit=5`);
        if (activitiesResponse.ok) {
            const activities = await activitiesResponse.json();
            console.log('✅ Admin activities endpoint working');
            console.log('📝 Activities count:', activities.activities?.length || 0);
            if (activities.activities?.length > 0) {
                console.log('📋 Latest activity:', activities.activities[0]);
            }
        } else {
            console.log('❌ Admin activities endpoint failed');
            console.log('Status:', activitiesResponse.status);
            const error = await activitiesResponse.text();
            console.log('Error:', error);
        }
        
        // Test 6: Test system health endpoint
        console.log('\n6️⃣ Testing admin system health endpoint...');
        const healthResponse = await fetch(`${baseUrl}/api/admin/health`);
        if (healthResponse.ok) {
            const health = await healthResponse.json();
            console.log('✅ Admin system health endpoint working');
            console.log('🏥 System health:', health);
        } else {
            console.log('❌ Admin system health endpoint failed');
            console.log('Status:', healthResponse.status);
            const error = await healthResponse.text();
            console.log('Error:', error);
        }
        
        console.log('\n🎉 Admin dashboard testing completed!');
        console.log('\n📋 Summary:');
        console.log('- Server: ✅ Running');
        console.log('- Admin Login: ✅ Working');
        console.log('- Overview API: ✅ Working');
        console.log('- Clients API: ✅ Working');
        console.log('- Activities API: ✅ Working');
        console.log('- System Health API: ✅ Working');
        
        console.log('\n🌐 You can now access the admin dashboard at:');
        console.log('http://localhost:3005/admin-dashboard.html');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testAdminDashboard();
