const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dreams.db');

class Database {
    constructor() {
        this.db = new sqlite3.Database(dbPath);
        this.init();
    }

    init() {
        // Create tables if they don't exist
        this.db.serialize(() => {
            // Users table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    joinedAt INTEGER NOT NULL,
                    badgeShareCount INTEGER DEFAULT 0,
                    profileImage TEXT,
                    coverImage TEXT,
                    bio TEXT,
                    website TEXT,
                    location TEXT
                )
            `);

            // Posts table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS posts (
                    id TEXT PRIMARY KEY,
                    authorEmail TEXT NOT NULL,
                    authorName TEXT NOT NULL,
                    title TEXT NOT NULL,
                    text TEXT NOT NULL,
                    mood TEXT,
                    contentType TEXT DEFAULT 'dream',
                    public INTEGER DEFAULT 1,
                    likes INTEGER DEFAULT 0,
                    likedBy TEXT,
                    createdAt INTEGER NOT NULL,
                    imageUrl TEXT,
                    videoUrl TEXT,
                    FOREIGN KEY (authorEmail) REFERENCES users (email)
                )
            `);

            // Comments table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS comments (
                    id TEXT PRIMARY KEY,
                    postId TEXT NOT NULL,
                    authorEmail TEXT NOT NULL,
                    authorName TEXT NOT NULL,
                    text TEXT NOT NULL,
                    createdAt INTEGER NOT NULL,
                    FOREIGN KEY (postId) REFERENCES posts (id) ON DELETE CASCADE,
                    FOREIGN KEY (authorEmail) REFERENCES users (email)
                )
            `);

            // Bookmarks table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS bookmarks (
                    id TEXT PRIMARY KEY,
                    userEmail TEXT NOT NULL,
                    postId TEXT NOT NULL,
                    createdAt INTEGER NOT NULL,
                    FOREIGN KEY (userEmail) REFERENCES users (email),
                    FOREIGN KEY (postId) REFERENCES posts (id),
                    UNIQUE(userEmail, postId)
                )
            `);
        });
    }

    // User operations
    async createUser(userData) {
        return new Promise((resolve, reject) => {
            const { id, name, email, password, salt, joinedAt } = userData;
            this.db.run(
                'INSERT INTO users (id, name, email, password, salt, joinedAt) VALUES (?, ?, ?, ?, ?, ?)',
                [id, name, email, password, salt, joinedAt],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id, name, email, joinedAt });
                }
            );
        });
    }

    async getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE email = ?',
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async updateUserProfile(email, updates) {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];
            
            if (updates.name) {
                fields.push('name = ?');
                values.push(updates.name);
            }
            if (updates.profileImage) {
                fields.push('profileImage = ?');
                values.push(updates.profileImage);
            }
            if (updates.coverImage) {
                fields.push('coverImage = ?');
                values.push(updates.coverImage);
            }
            if (updates.bio !== undefined) {
                fields.push('bio = ?');
                values.push(updates.bio);
            }
            if (updates.website !== undefined) {
                fields.push('website = ?');
                values.push(updates.website);
            }
            if (updates.location !== undefined) {
                fields.push('location = ?');
                values.push(updates.location);
            }
            
            if (fields.length === 0) {
                resolve(null);
                return;
            }
            
            values.push(email);
            
            this.db.run(
                `UPDATE users SET ${fields.join(', ')} WHERE email = ?`,
                values,
                function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                }
            );
        });
    }

    // Post operations
    async createPost(postData) {
        return new Promise((resolve, reject) => {
            console.log('🎬 [DATABASE] createPost called with:', postData);
            const { id, authorEmail, authorName, title, text, mood, contentType, public: isPublic, createdAt, imageUrl, videoUrl } = postData;
            
            console.log('🎬 [DATABASE] Extracted fields:', { id, authorEmail, authorName, title, text, mood, contentType, isPublic, createdAt, imageUrl, videoUrl });
            
            this.db.run(
                'INSERT INTO posts (id, authorEmail, authorName, title, text, mood, contentType, public, createdAt, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, authorEmail, authorName, title, text, mood, contentType || 'dream', isPublic ? 1 : 0, createdAt, imageUrl],
                function(err) {
                    if (err) {
                        console.error('❌ [DATABASE] createPost error:', err.message);
                        console.error('❌ [DATABASE] Error details:', err);
                        reject(err);
                    } else {
                        console.log('✅ [DATABASE] createPost success');
                        resolve({ id, authorEmail, authorName, text, createdAt });
                    }
                }
            );
        });
    }

    async getAllPosts() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT p.*, 
                        GROUP_CONCAT(c.id) as commentIds,
                        COUNT(c.id) as commentCount
                 FROM posts p
                 LEFT JOIN comments c ON p.id = c.postId
                 WHERE p.public = 1
                 GROUP BY p.id
                 ORDER BY p.createdAt DESC`,
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        const posts = rows.map(row => ({
                            ...row,
                            public: Boolean(row.public),
                            likedBy: row.likedBy ? JSON.parse(row.likedBy) : [],
                            comments: []
                        }));
                        resolve(posts);
                    }
                }
            );
        });
    }

    async getPostById(postId) {
        return new Promise((resolve, reject) => {
            // First get the post
            this.db.get(
                'SELECT * FROM posts WHERE id = ?',
                [postId],
                (err, row) => {
                    if (err) reject(err);
                    else if (row) {
                        // Then get comments for this post
                        this.db.all(
                            'SELECT * FROM comments WHERE postId = ? ORDER BY createdAt DESC',
                            [postId],
                            (commentErr, comments) => {
                                if (commentErr) reject(commentErr);
                                else {
                                    resolve({
                                        ...row,
                                        public: Boolean(row.public),
                                        likedBy: row.likedBy ? JSON.parse(row.likedBy) : [],
                                        comments: comments || []
                                    });
                                }
                            }
                        );
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    }

    async updatePostLikes(postId, likes, likedBy) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE posts SET likes = ?, likedBy = ? WHERE id = ?',
                [likes, JSON.stringify(likedBy), postId],
                function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                }
            );
        });
    }

    async addComment(commentData) {
        return new Promise((resolve, reject) => {
            const { id, postId, authorEmail, authorName, text, createdAt } = commentData;
            this.db.run(
                'INSERT INTO comments (id, postId, authorEmail, authorName, text, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
                [id, postId, authorEmail, authorName, text, createdAt],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id, postId, authorEmail, text, createdAt });
                }
            );
        });
    }

    async getCommentsByPostId(postId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM comments WHERE postId = ? ORDER BY createdAt DESC',
                [postId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async addBookmark(userEmail, postId) {
        return new Promise((resolve, reject) => {
            const bookmarkId = `${userEmail}_${postId}_${Date.now()}`;
            this.db.run(
                'INSERT OR IGNORE INTO bookmarks (id, userEmail, postId, createdAt) VALUES (?, ?, ?, ?)',
                [bookmarkId, userEmail, postId, Date.now()],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: bookmarkId, userEmail, postId });
                }
            );
        });
    }

    async removeBookmark(userEmail, postId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM bookmarks WHERE userEmail = ? AND postId = ?',
                [userEmail, postId],
                function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                }
            );
        });
    }

    async getUserBookmarks(userEmail) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT b.id as bookmarkId, b.userEmail, b.postId, b.createdAt as bookmarkCreatedAt,
                        p.id, p.authorEmail, p.authorName, p.text, p.mood, p.contentType, 
                        p.public, p.likes, p.likedBy, p.createdAt, p.imageUrl, p.videoUrl
                 FROM bookmarks b
                 JOIN posts p ON b.postId = p.id
                 WHERE b.userEmail = ?
                 ORDER BY b.createdAt DESC`
                [userEmail],
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        const posts = rows.map(row => ({
                            id: row.id,
                            authorEmail: row.authorEmail,
                            authorName: row.authorName,
                            text: row.text,
                            mood: row.mood,
                            contentType: row.contentType,
                            public: Boolean(row.public),
                            likes: row.likes,
                            likedBy: row.likedBy ? JSON.parse(row.likedBy) : [],
                            createdAt: row.createdAt,
                            imageUrl: row.imageUrl,
                            videoUrl: row.videoUrl,
                            bookmarkId: row.bookmarkId,
                            bookmarkCreatedAt: row.bookmarkCreatedAt
                        }));
                        resolve(posts);
                    }
                }
            );
        });
    }

    // Close database connection
    close() {
        this.db.close();
    }
}

module.exports = new Database();
