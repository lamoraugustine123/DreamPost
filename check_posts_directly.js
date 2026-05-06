const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dreams.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking posts directly from database...');

db.all('SELECT * FROM posts ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
        console.error('Error fetching posts:', err.message);
        return;
    }
    
    console.log(`📊 Found ${rows.length} posts in database:`);
    rows.forEach((post, index) => {
        console.log(`\nPost ${index + 1}:`);
        console.log(`  ID: ${post.id}`);
        console.log(`  Title: ${post.title || 'No title'}`);
        console.log(`  Text: ${post.text ? post.text.substring(0, 50) + '...' : 'No text'}`);
        console.log(`  Mood: ${post.mood}`);
        console.log(`  Image: ${post.image ? 'Yes' : 'No'}`);
        console.log(`  Author: ${post.authorName}`);
        console.log(`  Created: ${post.createdAt}`);
        console.log(`  Timestamp: ${new Date(post.createdAt).toISOString()}`);
    });
    
    db.close();
});
