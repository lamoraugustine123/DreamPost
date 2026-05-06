const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dreams.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking database schema...');

db.all("PRAGMA table_info(posts)", (err, rows) => {
    if (err) {
        console.error('Error checking schema:', err.message);
        return;
    }
    
    console.log('📊 Posts table schema:');
    rows.forEach(row => {
        console.log(`  ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
    });
    
    db.close();
});
