// Supabase Setup Script for DreamPost Platform
// This script sets up the Supabase PostgreSQL database with required schema

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://upkwtzufdedsfjklzmdq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'sb_publishable_P9fE83tNmSbEXq8HNomQoQ_JwREITkz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupSupabase() {
    console.log('🚀 Setting up Supabase for DreamPost Platform...');
    
    try {
        // Test connection
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('❌ Supabase connection failed:', error);
            process.exit(1);
        }
        
        console.log('✅ Supabase connection successful');
        console.log(`🌐 Supabase URL: ${supabaseUrl}`);
        console.log(`🔑 Using service key for setup`);
        
        // Create admin user if it doesn't exist
        const { data: existingAdmin } = await supabase
            .from('users')
            .select('id, email, role')
            .eq('email', 'admin@dreampost.com')
            .single();
        
        if (!existingAdmin) {
            console.log('👤 Creating default admin user...');
            
            const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
                email: 'admin@dreampost.com',
                password: 'admin123456',
                email_confirm: true,
                data: {
                    name: 'Admin User',
                    role: 'admin'
                }
            });
            
            if (adminError) {
                console.error('❌ Failed to create admin user:', adminError);
            } else {
                console.log('✅ Default admin user created');
                console.log('📧 Email: admin@dreampost.com');
                console.log('🔑 Password: admin123456');
            }
        } else {
            console.log('✅ Admin user already exists');
        }
        
        console.log('\n🎯 Supabase Setup Complete!');
        console.log('📊 Ready for cloud analytics and user management');
        console.log('🔄 Dual database mode: SQLite3 (local) + Supabase (cloud)');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

// Environment variables setup
function setupEnvironment() {
    console.log('\n📝 Environment Setup Instructions:');
    console.log('1. Create a .env file in your project root');
    console.log('2. Add the following variables:');
    console.log('');
    console.log('SUPABASE_URL=https://upkwtzufdedsfjklzmdq.supabase.co');
    console.log('SUPABASE_SERVICE_KEY=your-service-key-here');
    console.log('SUPABASE_SECRET_KEY=your-secret-key-here');
    console.log('');
    console.log('3. Run: npm run setup:supabase');
}

if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        setupEnvironment();
    } else {
        setupSupabase();
    }
}

module.exports = { setupSupabase, setupEnvironment };
