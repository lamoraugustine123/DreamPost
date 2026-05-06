const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing and creating proper database...');

// Remove any old database files
const oldDbFiles = ['dreams.db', 'dreampost.db'];
oldDbFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`🗑️ Removing old file: ${file}`);
        fs.unlinkSync(filePath);
    }
});

// Create fresh database
const dbPath = path.join(__dirname, 'dreams.db');
const db = new sqlite3.Database(dbPath);

console.log(`📊 Creating database at: ${dbPath}`);

db.serialize(() => {
    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            salt TEXT NOT NULL,
            joinedAt INTEGER NOT NULL,
            badgeShareCount INTEGER DEFAULT 0,
            bio TEXT,
            profileImage TEXT,
            coverImage TEXT,
            website TEXT,
            location TEXT
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating users table:', err.message);
        } else {
            console.log('✅ Users table created');
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            text TEXT NOT NULL,
            mood TEXT NOT NULL,
            image TEXT,
            public INTEGER DEFAULT 1,
            authorEmail TEXT NOT NULL,
            authorName TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            createdAt INTEGER NOT NULL,
            contentType TEXT DEFAULT 'dream',
            FOREIGN KEY (authorEmail) REFERENCES users(email)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating posts table:', err.message);
        } else {
            console.log('✅ Posts table created');
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            postId TEXT NOT NULL,
            authorEmail TEXT NOT NULL,
            authorName TEXT NOT NULL,
            text TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
            FOREIGN KEY (authorEmail) REFERENCES users(email)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating comments table:', err.message);
        } else {
            console.log('✅ Comments table created');
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS likes (
            id TEXT PRIMARY KEY,
            postId TEXT NOT NULL,
            userEmail TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            FOREIGN KEY (postId) REFERENCES posts(id),
            FOREIGN KEY (userEmail) REFERENCES users(email),
            UNIQUE(postId, userEmail)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating likes table:', err.message);
        } else {
            console.log('✅ Likes table created');
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
            id TEXT PRIMARY KEY,
            userEmail TEXT NOT NULL,
            postId TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            FOREIGN KEY (userEmail) REFERENCES users(email),
            FOREIGN KEY (postId) REFERENCES posts(id),
            UNIQUE(userEmail, postId)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating bookmarks table:', err.message);
        } else {
            console.log('✅ Bookmarks table created');
        }
    });

    // Insert the correct users from database.sql
    const insertUser = db.prepare('INSERT INTO users (id, name, email, password, salt, joinedAt) VALUES (?, ?, ?, ?, ?, ?)');
    
    const users = [
        {
            id: '1777344347860',
            name: 'test user1',
            email: 'lamoraugustine122@gmail.com',
            password: '7bc4186743f28bf4c10d3d386348f84e657ef9ca40df93e98135a8280f0b20a2',
            salt: '75ea053863c959a179a5f44558ac98fd',
            joinedAt: 1777344347860
        },
        {
            id: '1777352453301',
            name: 'test user2',
            email: 'lamarkchristopher770@gmail.com',
            password: 'd7835b4864ac6852db6ee80e7e25f793aa4a891cbe2cb0305f656d2fcf0eb58c',
            salt: '1675afe84f9f7b044000c10e95cc3fed',
            joinedAt: 1777352453301
        }
    ];

    console.log('👥 Inserting users...');
    users.forEach(user => {
        insertUser.run(user.id, user.name, user.email, user.password, user.salt, user.joinedAt);
    });

    console.log('✅ Database setup completed!');
    db.close((err) => {
        if (err) {
            console.error('❌ Error closing database:', err.message);
        } else {
            console.log('🎉 Database created successfully with users!');
        }
    });
});
