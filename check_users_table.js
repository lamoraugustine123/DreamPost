const Database = require('./database');

async function checkUsersTable() {
    try {
        console.log('🔍 Checking users table structure...');
        
        Database.db.all('PRAGMA table_info(users)', (err, rows) => {
            if (err) {
                console.error('❌ Error:', err);
                return;
            }
            
            console.log('📊 Users table structure:');
            rows.forEach(row => {
                console.log(`  - ${row.name}: ${row.type} (nullable: ${!row.notnull})`);
            });
            
            Database.close();
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkUsersTable();
