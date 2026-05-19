const Database = require('./database');

async function debugAdminRole() {
    try {
        console.log('🔍 Debugging admin role setup...\n');
        
        // Check admin user
        const adminUser = await Database.getUserByEmail('admin@dreampost.com');
        if (adminUser) {
            console.log('✅ Admin user found:');
            console.log('   ID:', adminUser.id);
            console.log('   Name:', adminUser.name);
            console.log('   Email:', adminUser.email);
            console.log('   Role:', adminUser.role);
            console.log('   Status:', adminUser.status);
        } else {
            console.log('❌ Admin user not found');
            return;
        }
        
        // Check admin role
        const adminRole = await Database.getAdminRole(adminUser.role);
        if (adminRole) {
            console.log('\n✅ Admin role found:');
            console.log('   ID:', adminRole.id);
            console.log('   Name:', adminRole.name);
            console.log('   Permissions:', adminRole.permissions);
        } else {
            console.log('\n❌ Admin role not found for role:', adminUser.role);
            
            // Check what roles exist
            console.log('\n🔍 Checking available roles...');
            const roles = await new Promise((resolve, reject) => {
                Database.db.all('SELECT * FROM admin_roles', (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            console.log('Available roles:');
            roles.forEach(role => {
                console.log(`   - ${role.name}: ${role.permissions}`);
            });
        }
        
        // Test permission check manually
        console.log('\n🔍 Testing permission check...');
        const permissions = JSON.parse(adminRole?.permissions || '[]');
        console.log('Permissions array:', permissions);
        console.log('Has "all" permission:', permissions.includes('all'));
        console.log('Has "view_analytics" permission:', permissions.includes('view_analytics'));
        
    } catch (error) {
        console.error('❌ Debug error:', error);
    } finally {
        Database.close();
    }
}

debugAdminRole();
