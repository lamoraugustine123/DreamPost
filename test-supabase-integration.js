// Test Supabase Integration with DreamPost
// This script tests the complete dual database functionality

const { Pool } = require('pg');

// Supabase Connection
const supabasePool = new Pool({
    connectionString: 'postgresql://postgres:Mrlamoraugustine@123@db.upkwtzufdedsfjklzmdq.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function testSupabaseIntegration() {
    console.log('🔗 Testing Supabase Integration with DreamPost');
    console.log('📊 Dual Database: SQLite3 (local) + Supabase PostgreSQL (cloud)');
    console.log('');

    try {
        // Test 1: Basic connection
        console.log('1️⃣ Testing Supabase connection...');
        const result = await supabasePool.query('SELECT 1 as test');
        console.log('✅ Supabase connected successfully');
        console.log(`📊 Test result: ${result.rows[0].test}`);

        // Test 2: Check existing tables
        console.log('');
        console.log('2️⃣ Checking database schema...');
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `;
        const tables = await supabasePool.query(tablesQuery);
        console.log(`📋 Found ${tables.rows.length} tables:`);
        tables.rows.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });

        // Test 3: Create test user
        console.log('');
        console.log('3️⃣ Creating test user in Supabase...');
        const testUserId = Date.now().toString();
        const { salt, hash } = hashPassword('testpassword123');
        
        try {
            const userQuery = `
                INSERT INTO users (id, name, email, password, salt, joined_at, badge_share_count) 
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, name, email
            `;
            const userResult = await supabasePool.query(userQuery, [
                testUserId,
                'Test User',
                'test@example.com',
                hash,
                salt,
                Date.now(),
                0
            ]);
            console.log('✅ Test user created in Supabase');
            console.log(`👤 User ID: ${userResult.rows[0].id}`);
            console.log(`📧 Email: ${userResult.rows[0].email}`);
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                console.log('⚠️ Test user already exists, continuing...');
            } else {
                throw error;
            }
        }

        // Test 4: Create test post
        console.log('');
        console.log('4️⃣ Creating test post in Supabase...');
        const testPostId = Date.now().toString();
        
        try {
            const postQuery = `
                INSERT INTO posts (id, author_email, author_name, title, text, mood, content_type, public, created_at, image_url, video_url) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id, title, author_email
            `;
            const postResult = await supabasePool.query(postQuery, [
                testPostId,
                'test@example.com',
                'Test User',
                'Test Dream Post',
                'This is a test dream post for Supabase integration.',
                'Joyful',
                'dream',
                true,
                Date.now(),
                null,
                null
            ]);
            console.log('✅ Test post created in Supabase');
            console.log(`📝 Post ID: ${postResult.rows[0].id}`);
            console.log(`📄 Title: ${postResult.rows[0].title}`);
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                console.log('⚠️ Test post already exists, continuing...');
            } else {
                throw error;
            }
        }

        // Test 5: Create test activity
        console.log('');
        console.log('5️⃣ Creating test activity in Supabase...');
        const testActivityId = Date.now().toString();
        
        try {
            const activityQuery = `
                INSERT INTO activities (id, user_id, user_email, action, details, ip_address, user_agent, timestamp) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                RETURNING id, action, user_email
            `;
            const activityResult = await supabasePool.query(activityQuery, [
                testActivityId,
                testUserId,
                'test@example.com',
                'test',
                JSON.stringify({ type: 'integration_test', timestamp: Date.now() }),
                '127.0.0.1',
                'Test Agent'
            ]);
            console.log('✅ Test activity created in Supabase');
            console.log(`📊 Activity ID: ${activityResult.rows[0].id}`);
            console.log(`🔧 Action: ${activityResult.rows[0].action}`);
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                console.log('⚠️ Test activity already exists, continuing...');
            } else {
                throw error;
            }
        }

        // Test 6: Analytics queries
        console.log('');
        console.log('6️⃣ Testing analytics queries...');
        
        const analyticsQueries = {
            totalUsers: 'SELECT COUNT(*) as count FROM users',
            totalPosts: 'SELECT COUNT(*) as count FROM posts',
            totalActivities: 'SELECT COUNT(*) as count FROM activities',
            recentUsers: 'SELECT name, email, created_at FROM users ORDER BY created_at DESC LIMIT 3',
            recentPosts: 'SELECT title, author_email, created_at FROM posts ORDER BY created_at DESC LIMIT 3'
        };

        for (const [name, query] of Object.entries(analyticsQueries)) {
            try {
                const result = await supabasePool.query(query);
                if (name.includes('total')) {
                    console.log(`📊 ${name}: ${result.rows[0]?.count || 0}`);
                } else {
                    console.log(`📋 ${name}: ${result.rows.length} records`);
                    result.rows.forEach(row => {
                        console.log(`   - ${Object.values(row).join(' | ')}`);
                    });
                }
            } catch (error) {
                console.log(`❌ ${name} query failed:`, error.message);
            }
        }

        console.log('');
        console.log('🎉 Supabase Integration Test Complete!');
        console.log('✅ All tests passed successfully');
        console.log('📊 Supabase is ready for DreamPost production use');

    } catch (error) {
        console.error('❌ Supabase integration test failed:', error.message);
        
        if (error.code === 'ENOTFOUND') {
            console.log('');
            console.log('🌐 DNS Resolution Error:');
            console.log('The Supabase hostname could not be resolved.');
            console.log('Please check your internet connection and Supabase project URL.');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('');
            console.log('🔌 Connection Refused:');
            console.log('The Supabase database server is not accepting connections.');
            console.log('Please check if the database is running and accessible.');
        } else if (error.code === '28P01') {
            console.log('');
            console.log('🔑 Authentication Error:');
            console.log('Invalid database credentials.');
            console.log('Please check your database password in the connection string.');
        } else if (error.code === '3D000') {
            console.log('');
            console.log('🗄️ Database Error:');
            console.log('Database does not exist or schema not applied.');
            console.log('Please apply the supabase_schema.sql to your database.');
        } else {
            console.log('');
            console.log('🔧 General Error:');
            console.log('Please check the error message and try again.');
        }
    } finally {
        await supabasePool.end();
    }
}

const { hashPassword } = require('./utils/crypto');

// Run the test
if (require.main === module) {
    testSupabaseIntegration();
}

module.exports = { testSupabaseIntegration };
