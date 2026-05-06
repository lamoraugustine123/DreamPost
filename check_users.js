const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dreams.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking users in database...');

db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
        console.error('Error fetching users:', err.message);
        return;
    }
    
    console.log(`📊 Found ${rows.length} users:`);
    rows.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Joined: ${user.joinedAt}`);
    });
    
    console.log('\n🔑 Login Credentials:');
    console.log('Option 1 - test user1:');
    console.log('  Email: lamoraugustine122@gmail.com');
    console.log('  Password: any password (check database.sql for hash)');
    
    console.log('\nOption 2 - test user2:');
    console.log('  Email: lamarkchristopher770@gmail.com');
    console.log('  Password: any password (check database.sql for hash)');
    
    console.log('\n💡 Try logging in with these credentials to test the system!');
    
    db.close();
});
