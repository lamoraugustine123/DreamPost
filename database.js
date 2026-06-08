const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'dreams.db');

class Database {
    constructor(customPath) {
        this.db = new sqlite3.Database(customPath || dbPath);
        this._stmtCache = {};
        this.init();
    }

    init() {
        // Create tables if they don't exist
        this.db.serialize(() => {
            // Performance: WAL mode for concurrent reads + writes
            this.db.run('PRAGMA journal_mode = WAL');
            this.db.run('PRAGMA synchronous = NORMAL');
            this.db.run('PRAGMA cache_size = -20000');  // 20MB cache
            this.db.run('PRAGMA mmap_size = 268435456'); // 256MB memory-mapped I/O
            this.db.run('PRAGMA temp_store = MEMORY');
            this.db.run('PRAGMA busy_timeout = 5000');
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
                    location TEXT,
                    phone TEXT
                )
            `);
            // Migration: add phone to existing users tables
            this.db.run(`ALTER TABLE users ADD COLUMN phone TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column')) console.log('Migration: phone already exists or error:', err?.message);
            });

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
                    parentId TEXT,
                    FOREIGN KEY (postId) REFERENCES posts (id) ON DELETE CASCADE,
                    FOREIGN KEY (authorEmail) REFERENCES users (email)
                )
            `);
            // Migration: add parentId to existing comments tables
            this.db.run(`ALTER TABLE comments ADD COLUMN parentId TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column')) console.log('Migration: parentId already exists or error:', err?.message);
            });

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

            // Follows table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS follows (
                    id TEXT PRIMARY KEY,
                    followerEmail TEXT NOT NULL,
                    followingEmail TEXT NOT NULL,
                    createdAt INTEGER NOT NULL,
                    FOREIGN KEY (followerEmail) REFERENCES users (email),
                    FOREIGN KEY (followingEmail) REFERENCES users (email),
                    UNIQUE(followerEmail, followingEmail)
                )
            `);

            // Pending posts table for retry mechanism
            this.db.run(`
                CREATE TABLE IF NOT EXISTS pending_posts (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    text TEXT NOT NULL,
                    mood TEXT,
                    contentType TEXT DEFAULT 'dream',
                    public INTEGER DEFAULT 1,
                    authorEmail TEXT,
                    authorName TEXT NOT NULL,
                    imageUrl TEXT,
                    videoUrl TEXT,
                    createdAt INTEGER NOT NULL,
                    retryCount INTEGER DEFAULT 0,
                    lastRetryAt INTEGER,
                    error TEXT
                )
            `);

            // Statuses table (WhatsApp/Facebook hybrid - 24h expiry)
            // Drop and recreate to fix schema issues
            this.db.run(`DROP TABLE IF EXISTS statuses`);
            this.db.run(`
                CREATE TABLE statuses (
                    id TEXT PRIMARY KEY,
                    authorEmail TEXT NOT NULL,
                    authorName TEXT NOT NULL,
                    type TEXT DEFAULT 'text',
                    mediaType TEXT DEFAULT 'text',
                    text TEXT,
                    backgroundColor TEXT DEFAULT '#075e54',
                    fontStyle TEXT DEFAULT 'normal',
                    mediaUrl TEXT,
                    mediaThumbnail TEXT,
                    audioUrl TEXT,
                    caption TEXT,
                    mood TEXT DEFAULT 'casual',
                    mode TEXT DEFAULT 'whatsapp',
                    privacy TEXT DEFAULT 'contacts',
                    privacyList TEXT DEFAULT '[]',
                    allowReplies INTEGER DEFAULT 1,
                    allowLikes INTEGER DEFAULT 1,
                    allowComments INTEGER DEFAULT 1,
                    viewedBy TEXT DEFAULT '[]',
                    likes INTEGER DEFAULT 0,
                    comments INTEGER DEFAULT 0,
                    createdAt INTEGER NOT NULL,
                    expiresAt INTEGER NOT NULL,
                    FOREIGN KEY (authorEmail) REFERENCES users (email)
                )
            `);

            // Performance indexes
            this.db.run('CREATE INDEX IF NOT EXISTS idx_statuses_authorEmail ON statuses(authorEmail)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_statuses_expiresAt ON statuses(expiresAt)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_statuses_createdAt ON statuses(createdAt DESC)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_posts_authorEmail ON posts(authorEmail)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_posts_createdAt ON posts(createdAt DESC)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_posts_public ON posts(public)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_comments_postId ON comments(postId)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_bookmarks_userEmail ON bookmarks(userEmail)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_bookmarks_postId ON bookmarks(postId)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_follows_followerEmail ON follows(followerEmail)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_follows_followingEmail ON follows(followingEmail)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        });
    }

    // Batch query: get all posts with comment counts in ONE query (eliminates N+1)
    async getAllPostsWithComments() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT p.*, COUNT(c.id) as commentCount
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
                            comments: [],
                            commentCount: row.commentCount || 0
                        }));
                        resolve(posts);
                    }
                }
            );
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
                            (commentErr, rawComments) => {
                                if (commentErr) reject(commentErr);
                                else {
                                    // Organize comments: parent comments with nested replies
                                    const comments = rawComments || [];
                                    const parents = [];
                                    const replyMap = new Map();
                                    comments.forEach(c => {
                                        if (c.parentId) {
                                            if (!replyMap.has(c.parentId)) replyMap.set(c.parentId, []);
                                            replyMap.get(c.parentId).push(c);
                                        } else {
                                            parents.push(c);
                                        }
                                    });
                                    parents.forEach(p => {
                                        p.replies = replyMap.get(p.id) || [];
                                    });
                                    resolve({
                                        ...row,
                                        public: Boolean(row.public),
                                        likedBy: row.likedBy ? JSON.parse(row.likedBy) : [],
                                        comments: parents
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
            const { id, postId, authorEmail, authorName, text, createdAt, parentId } = commentData;
            this.db.run(
                'INSERT INTO comments (id, postId, authorEmail, authorName, text, createdAt, parentId) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, postId, authorEmail, authorName, text, createdAt, parentId || null],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id, postId, authorEmail, authorName, text, createdAt, parentId: parentId || null });
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

    // ===== ADMIN DASHBOARD FUNCTIONS =====

    // Get admin overview statistics
    async getAdminOverview() {
        return new Promise((resolve, reject) => {
            const overview = {};
            
            // Get total users
            this.db.get('SELECT COUNT(*) as total FROM users', (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                overview.totalUsers = row.total;
                
                // Get active users (logged in within last 30 days)
                const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                this.db.get('SELECT COUNT(*) as active FROM users WHERE lastLogin > ?', [thirtyDaysAgo], (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    overview.activeUsers = row.active;
                    
                    // Get total posts
                    this.db.get('SELECT COUNT(*) as total FROM posts', (err, row) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        overview.totalPosts = row.total;
                        
                        // Get new signups (last 7 days)
                        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                        this.db.get('SELECT COUNT(*) as newSignups FROM users WHERE joinedAt > ?', [sevenDaysAgo], (err, row) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            overview.newSignups = row.newSignups;
                            
                            // Get recent activities count
                            this.db.get('SELECT COUNT(*) as activities FROM activity_logs WHERE timestamp > ?', [sevenDaysAgo], (err, row) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                overview.recentActivities = row.activities;
                                
                                resolve(overview);
                            });
                        });
                    });
                });
            });
        });
    }

    // Get clients with pagination and filtering
    async getClients(options = {}) {
        const { page = 1, limit = 20, search = '', status = 'all', role = 'all' } = options;
        const offset = (page - 1) * limit;
        
        return new Promise((resolve, reject) => {
            let query = 'SELECT id, name, email, role, status, joinedAt, lastLogin, loginCount FROM users WHERE 1=1';
            const params = [];
            
            if (search) {
                query += ' AND (name LIKE ? OR email LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }
            
            if (status !== 'all') {
                query += ' AND status = ?';
                params.push(status);
            }
            
            if (role !== 'all') {
                query += ' AND role = ?';
                params.push(role);
            }
            
            query += ' ORDER BY joinedAt DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Get total count for pagination
                let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
                const countParams = [];
                
                if (search) {
                    countQuery += ' AND (name LIKE ? OR email LIKE ?)';
                    countParams.push(`%${search}%`, `%${search}%`);
                }
                
                if (status !== 'all') {
                    countQuery += ' AND status = ?';
                    countParams.push(status);
                }
                
                if (role !== 'all') {
                    countQuery += ' AND role = ?';
                    countParams.push(role);
                }
                
                this.db.get(countQuery, countParams, (err, countRow) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    resolve({
                        clients: rows,
                        pagination: {
                            page,
                            limit,
                            total: countRow.total,
                            pages: Math.ceil(countRow.total / limit)
                        }
                    });
                });
            });
        });
    }

    // Get client details
    async getClientDetails(clientId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE id = ?',
                [clientId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (!row) {
                        resolve(null);
                        return;
                    }
                    
                    // Get client's posts count
                    this.db.get(
                        'SELECT COUNT(*) as postCount FROM posts WHERE authorEmail = ?',
                        [row.email],
                        (err, postRow) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            
                            // Get client's activities
                            this.db.all(
                                'SELECT * FROM activity_logs WHERE userEmail = ? ORDER BY timestamp DESC LIMIT 10',
                                [row.email],
                                (err, activityRows) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    
                                    resolve({
                                        ...row,
                                        postCount: postRow.postCount,
                                        recentActivities: activityRows
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    }

    // Update client status
    async updateClientStatus(clientId, { status, adminNotes }) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET status = ?, adminNotes = ? WHERE id = ?',
                [status, adminNotes, clientId],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({ success: true, changes: this.changes });
                }
            );
        });
    }

    // Get activity logs
    async getActivityLogs(options = {}) {
        const { page = 1, limit = 50, action = '', userId = '', startDate = '', endDate = '' } = options;
        const offset = (page - 1) * limit;
        
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM activity_logs WHERE 1=1';
            const params = [];
            
            if (action) {
                query += ' AND action = ?';
                params.push(action);
            }
            
            if (userId) {
                query += ' AND userId = ?';
                params.push(userId);
            }
            
            if (startDate) {
                query += ' AND timestamp >= ?';
                params.push(new Date(startDate).getTime());
            }
            
            if (endDate) {
                query += ' AND timestamp <= ?';
                params.push(new Date(endDate).getTime());
            }
            
            query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Get total count
                let countQuery = 'SELECT COUNT(*) as total FROM activity_logs WHERE 1=1';
                const countParams = [];
                
                if (action) {
                    countQuery += ' AND action = ?';
                    countParams.push(action);
                }
                
                if (userId) {
                    countQuery += ' AND userId = ?';
                    countParams.push(userId);
                }
                
                if (startDate) {
                    countQuery += ' AND timestamp >= ?';
                    countParams.push(new Date(startDate).getTime());
                }
                
                if (endDate) {
                    countQuery += ' AND timestamp <= ?';
                    countParams.push(new Date(endDate).getTime());
                }
                
                this.db.get(countQuery, countParams, (err, countRow) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    resolve({
                        activities: rows,
                        pagination: {
                            page,
                            limit,
                            total: countRow.total,
                            pages: Math.ceil(countRow.total / limit)
                        }
                    });
                });
            });
        });
    }

    // Get analytics data
    async getAnalytics(type = 'overview', period = '30d') {
        return new Promise((resolve, reject) => {
            const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
            const startDate = Date.now() - (days * 24 * 60 * 60 * 1000);
            
            if (type === 'overview') {
                // User growth over time
                this.db.all(
                    'SELECT DATE(joinedAt/1000, "unixepoch") as date, COUNT(*) as users FROM users WHERE joinedAt >= ? GROUP BY DATE(joinedAt/1000, "unixepoch") ORDER BY date',
                    [startDate],
                    (err, userRows) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        // Post activity over time
                        this.db.all(
                            'SELECT DATE(createdAt/1000, "unixepoch") as date, COUNT(*) as posts FROM posts WHERE createdAt >= ? GROUP BY DATE(createdAt/1000, "unixepoch") ORDER BY date',
                            [startDate],
                            (err, postRows) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                
                                resolve({
                                    userGrowth: userRows,
                                    postActivity: postRows,
                                    period
                                });
                            }
                        );
                    }
                );
            } else {
                resolve({ message: 'Analytics type not implemented yet' });
            }
        });
    }

    // Get system health
    async getSystemHealth() {
        return new Promise((resolve, reject) => {
            const health = {
                database: 'healthy',
                api: 'healthy',
                lastCheck: Date.now()
            };
            
            // Check database connectivity
            this.db.get('SELECT 1', (err) => {
                if (err) {
                    health.database = 'error';
                    health.databaseError = err.message;
                }
                
                // Get recent error logs
                this.db.all(
                    'SELECT * FROM system_logs WHERE level = "error" AND timestamp > ? ORDER BY timestamp DESC LIMIT 10',
                    [Date.now() - (24 * 60 * 60 * 1000)], // Last 24 hours
                    (err, rows) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        health.recentErrors = rows;
                        health.errorCount = rows.length;
                        
                        resolve(health);
                    }
                );
            });
        });
    }

    // Get admin role
    async getAdminRole(roleName) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM admin_roles WHERE name = ?',
                [roleName],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(row);
                }
            );
        });
    }

    // Export clients data
    async exportClients(options = {}) {
        const { format = 'csv', status = 'all', role = 'all' } = options;
        
        return new Promise((resolve, reject) => {
            let query = 'SELECT id, name, email, role, status, joinedAt, lastLogin, loginCount FROM users WHERE 1=1';
            const params = [];
            
            if (status !== 'all') {
                query += ' AND status = ?';
                params.push(status);
            }
            
            if (role !== 'all') {
                query += ' AND role = ?';
                params.push(role);
            }
            
            query += ' ORDER BY joinedAt DESC';
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (format === 'csv') {
                    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Joined At', 'Last Login', 'Login Count'];
                    const csvData = rows.map(row => [
                        row.id,
                        row.name,
                        row.email,
                        row.role,
                        row.status,
                        new Date(row.joinedAt).toISOString(),
                        row.lastLogin ? new Date(row.lastLogin).toISOString() : 'Never',
                        row.loginCount
                    ]);
                    
                    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
                    resolve(csv);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Export activities data
    async exportActivities(options = {}) {
        const { format = 'csv', startDate = '', endDate = '', action = '' } = options;
        
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM activity_logs WHERE 1=1';
            const params = [];
            
            if (startDate) {
                query += ' AND timestamp >= ?';
                params.push(new Date(startDate).getTime());
            }
            
            if (endDate) {
                query += ' AND timestamp <= ?';
                params.push(new Date(endDate).getTime());
            }
            
            if (action) {
                query += ' AND action = ?';
                params.push(action);
            }
            
            query += ' ORDER BY timestamp DESC';
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (format === 'csv') {
                    const headers = ['ID', 'User ID', 'User Email', 'Action', 'Details', 'IP Address', 'User Agent', 'Timestamp'];
                    const csvData = rows.map(row => [
                        row.id,
                        row.userId || '',
                        row.userEmail || '',
                        row.action,
                        row.details || '',
                        row.ipAddress || '',
                        row.userAgent || '',
                        new Date(row.timestamp).toISOString()
                    ]);
                    
                    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
                    resolve(csv);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Update user login information
    async updateUserLogin(userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET lastLogin = ?, loginCount = loginCount + 1 WHERE id = ?',
                [Date.now(), userId],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({ success: true, changes: this.changes });
                }
            );
        });
    }

    // Log activity
    async logActivity(userId, userEmail, action, details = {}, ipAddress = '', userAgent = '') {
        return new Promise((resolve, reject) => {
            const activityId = Date.now().toString();
            this.db.run(
                'INSERT INTO activity_logs (id, userId, userEmail, action, details, ipAddress, userAgent, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [activityId, userId, userEmail, action, JSON.stringify(details), ipAddress, userAgent, Date.now()],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({ id: activityId, success: true });
                }
            );
        });
    }

    // Pending posts operations
    async addPendingPost(postData) {
        return new Promise((resolve, reject) => {
            const { id, title, text, mood, contentType, public: isPublic, authorEmail, authorName, imageUrl, videoUrl } = postData;
            this.db.run(
                'INSERT INTO pending_posts (id, title, text, mood, contentType, public, authorEmail, authorName, imageUrl, videoUrl, createdAt, retryCount, lastRetryAt, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL)',
                [id, title, text, mood, contentType || 'dream', isPublic ? 1 : 0, authorEmail, authorName, imageUrl, videoUrl, Date.now()],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({ success: true, id });
                }
            );
        });
    }

    async getPendingPosts() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM pending_posts ORDER BY createdAt ASC', [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async updatePendingPostRetry(postId, retryCount, nextRetryAt, error) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE pending_posts SET retryCount = ?, lastRetryAt = ?, error = ? WHERE id = ?',
                [retryCount, nextRetryAt, error, postId],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({ success: true });
                }
            );
        });
    }

    async removePendingPost(postId) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM pending_posts WHERE id = ?', [postId], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ success: true });
            });
        });
    }

    // Generic run method for custom queries
    async run(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // ===== FOLLOW SYSTEM FUNCTIONS =====
    
    // Add follow relationship
    async addFollow(followerEmail, followingEmail) {
        return new Promise((resolve, reject) => {
            const followId = `${followerEmail}_${followingEmail}_${Date.now()}`;
            this.db.run(
                'INSERT INTO follows (id, followerEmail, followingEmail, createdAt) VALUES (?, ?, ?, ?)',
                [followId, followerEmail, followingEmail, Date.now()],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: followId });
                    }
                }
            );
        });
    }

    // Remove follow relationship
    async removeFollow(followerEmail, followingEmail) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM follows WHERE followerEmail = ? AND followingEmail = ?',
                [followerEmail, followingEmail],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ deleted: this.changes });
                    }
                }
            );
        });
    }

    // Check if user is following another user
    async checkFollowStatus(followerEmail, followingEmail) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM follows WHERE followerEmail = ? AND followingEmail = ?',
                [followerEmail, followingEmail],
                function(err, row) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(!!row);
                    }
                }
            );
        });
    }

    // Get follower count for a user
    async getFollowerCount(userEmail) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT COUNT(*) as count FROM follows WHERE followingEmail = ?',
                [userEmail],
                function(err, row) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row.count || 0);
                    }
                }
            );
        });
    }

    // Get following count for a user
    async getFollowingCount(userEmail) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT COUNT(*) as count FROM follows WHERE followerEmail = ?',
                [userEmail],
                function(err, row) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row.count || 0);
                    }
                }
            );
        });
    }

    // Get list of followers for a user
    async getFollowersList(userEmail) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT f.followerEmail, f.createdAt, u.name as followerName, u.profileImage
                 FROM follows f
                 LEFT JOIN users u ON f.followerEmail = u.email
                 WHERE f.followingEmail = ?
                 ORDER BY f.createdAt DESC`,
                [userEmail],
                function(err, rows) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                }
            );
        });
    }

    // Get list of users that a user is following
    async getFollowingList(userEmail) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT f.followingEmail, f.createdAt, u.name as followingName, u.profileImage
                 FROM follows f
                 LEFT JOIN users u ON f.followingEmail = u.email
                 WHERE f.followerEmail = ?
                 ORDER BY f.createdAt DESC`,
                [userEmail],
                function(err, rows) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                }
            );
        });
    }

    async updateUserProfileImage(email, profileImage) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET profile_image = ? WHERE email = ?',
                [profileImage, email],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    console.log(`✅ Updated profile image for ${email}`);
                    resolve({ success: true, changes: this.changes });
                }
            );
        });
    }

    async updateUserCoverImage(email, coverImage) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET cover_image = ? WHERE email = ?',
                [coverImage, email],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    console.log(`✅ Updated cover image for ${email}`);
                    resolve({ success: true, changes: this.changes });
                }
            );
        });
    }

    // ===== STATUS OPERATIONS =====

    async createStatus(statusData) {
        return new Promise((resolve, reject) => {
            const {
                id, authorEmail, authorName, type, mediaType, text, backgroundColor, fontStyle,
                mediaUrl, mediaThumbnail, audioUrl, caption, mood, mode, privacy, privacyList,
                allowReplies, allowLikes, allowComments, createdAt, expiresAt
            } = statusData;
            console.log('📝 Creating status:', { id, authorEmail, authorName, type, mediaType, text, privacy });
            this.db.run(
                `INSERT INTO statuses (id, authorEmail, authorName, type, mediaType, text, backgroundColor, fontStyle, mediaUrl, mediaThumbnail, audioUrl, caption, mood, mode, privacy, privacyList, allowReplies, allowLikes, allowComments, viewedBy, likes, comments, createdAt, expiresAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id, authorEmail, authorName, type || 'text', mediaType || 'text', text,
                    backgroundColor || '#075e54', fontStyle || 'normal', mediaUrl || null,
                    mediaThumbnail || null, audioUrl || null, caption || null, mood || 'casual',
                    mode || 'whatsapp', privacy || 'contacts', privacyList || '[]',
                    allowReplies !== undefined ? allowReplies : 1, allowLikes !== undefined ? allowLikes : 1,
                    allowComments !== undefined ? allowComments : 1, '[]', 0, 0, createdAt, expiresAt
                ],
                function(err) {
                    if (err) {
                        console.error('❌ Error creating status:', err);
                        reject(err);
                    } else {
                        console.log('✅ Status created successfully:', id);
                        resolve({
                            id, authorEmail, authorName, type, mediaType, text, backgroundColor, fontStyle,
                            mediaUrl, mediaThumbnail, audioUrl, caption, mood, mode, privacy, privacyList,
                            allowReplies, allowLikes, allowComments, createdAt, expiresAt, viewedBy: [], likes: 0, comments: 0
                        });
                    }
                }
            );
        });
    }

    async getActiveStatuses(userEmail = null) {
        const now = Date.now();
        console.log(`🕐 Current time (now): ${now}`);
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT s.*, u.profileImage, u.name as currentName
                 FROM statuses s
                 LEFT JOIN users u ON s.authorEmail = u.email
                 WHERE s.expiresAt > ?
                 ORDER BY s.createdAt DESC`,
                [now],
                (err, rows) => {
                    if (err) {
                        console.error('❌ Error fetching statuses:', err);
                        reject(err);
                    } else {
                        console.log(`📊 Fetched ${rows.length} statuses from database`);
                        if (rows.length > 0) {
                            console.log(`📊 First status expiresAt: ${rows[0].expiresAt}, createdAt: ${rows[0].createdAt}`);
                            console.log(`📊 Time until expiry: ${rows[0].expiresAt - now}ms`);
                        }
                        let statuses = (rows || []).map(row => ({
                            ...row,
                            viewedBy: row.viewedBy ? JSON.parse(row.viewedBy) : [],
                            privacyList: row.privacyList ? JSON.parse(row.privacyList) : [],
                            allowReplies: row.allowReplies === 1,
                            allowLikes: row.allowLikes === 1,
                            allowComments: row.allowComments === 1,
                            authorName: row.currentName || row.authorName
                        }));

                        // Filter by privacy settings if userEmail is provided
                        if (userEmail) {
                            const beforeFilter = statuses.length;
                            console.log(`📊 Before filter: ${statuses.length} statuses for user ${userEmail}`);
                            statuses = statuses.filter(status => {
                                // Always show own statuses
                                if (status.authorEmail === userEmail) {
                                    console.log(`✅ Showing own status: ${status.id} by ${status.authorEmail}`);
                                    return true;
                                }

                                // Public statuses are visible to everyone
                                if (status.privacy === 'public') return true;

                                // Contact-only statuses - check if user is following the author
                                if (status.privacy === 'contacts') {
                                    return this.isFollowing(userEmail, status.authorEmail);
                                }

                                // Selected contacts - check if user is in privacyList
                                if (status.privacy === 'selected') {
                                    return status.privacyList.includes(userEmail);
                                }

                                return false;
                            });
                            console.log(`📊 Filtered from ${beforeFilter} to ${statuses.length} statuses for user ${userEmail}`);
                        }

                        resolve(statuses);
                    }
                }
            );
        });
    }

    async deleteExpiredStatuses() {
        const now = Date.now();
        return new Promise((resolve, reject) => {
            this.db.run(
                `DELETE FROM statuses WHERE expiresAt <= ?`,
                [now],
                function(err) {
                    if (err) reject(err);
                    else resolve({ success: true, deletedCount: this.changes });
                }
            );
        });
    }

    async getStatusesByUser(email) {
        const now = Date.now();
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM statuses WHERE authorEmail = ? AND expiresAt > ? ORDER BY createdAt DESC`,
                [email, now],
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        const statuses = (rows || []).map(row => ({
                            ...row,
                            viewedBy: row.viewedBy ? JSON.parse(row.viewedBy) : []
                        }));
                        resolve(statuses);
                    }
                }
            );
        });
    }

    async markStatusViewed(statusId, viewerEmail) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT viewedBy FROM statuses WHERE id = ?', [statusId], (err, row) => {
                if (err) return reject(err);
                if (!row) return resolve({ changes: 0 });

                const viewedBy = row.viewedBy ? JSON.parse(row.viewedBy) : [];
                if (!viewedBy.includes(viewerEmail)) {
                    viewedBy.push(viewerEmail);
                    this.db.run(
                        'UPDATE statuses SET viewedBy = ? WHERE id = ?',
                        [JSON.stringify(viewedBy), statusId],
                        function(err) {
                            if (err) reject(err);
                            else resolve({ changes: this.changes });
                        }
                    );
                } else {
                    resolve({ changes: 0 });
                }
            });
        });
    }

    async deleteStatus(statusId, authorEmail) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM statuses WHERE id = ? AND authorEmail = ?',
                [statusId, authorEmail],
                function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                }
            );
        });
    }

    async cleanupExpiredStatuses() {
        const now = Date.now();
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM statuses WHERE expiresAt <= ?',
                [now],
                function(err) {
                    if (err) reject(err);
                    else resolve({ deleted: this.changes });
                }
            );
        });
    }

    async likeStatus(statusId, userEmail) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE statuses SET likes = likes + 1 WHERE id = ?',
                [statusId],
                function(err) {
                    if (err) reject(err);
                    else resolve({ success: true, likes: this.changes });
                }
            );
        });
    }

    async unlikeStatus(statusId, userEmail) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE statuses SET likes = MAX(0, likes - 1) WHERE id = ?',
                [statusId],
                function(err) {
                    if (err) reject(err);
                    else resolve({ success: true, likes: this.changes });
                }
            );
        });
    }

    async commentOnStatus(statusId, userEmail, userName, text) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE statuses SET comments = comments + 1 WHERE id = ?',
                [statusId],
                function(err) {
                    if (err) reject(err);
                    else resolve({ success: true, comments: this.changes });
                }
            );
        });
    }

    async getStatusComments(statusId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT comments FROM statuses WHERE id = ?',
                [statusId],
                function(err, rows) {
                    if (err) reject(err);
                    else resolve(rows[0] ? rows[0].comments : 0);
                }
            );
        });
    }

    async repostStatus(originalStatusId, authorEmail, authorName) {
        return new Promise((resolve, reject) => {
            // First get the original status
            this.db.get(
                'SELECT * FROM statuses WHERE id = ?',
                [originalStatusId],
                (err, originalStatus) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (!originalStatus) {
                        reject(new Error('Original status not found'));
                        return;
                    }

                    // Create a new status as a repost
                    const now = Date.now();
                    const newStatus = {
                        id: now.toString() + '-' + Math.random().toString(36).substr(2, 9),
                        authorEmail: authorEmail,
                        authorName: authorName,
                        type: originalStatus.type,
                        mediaType: originalStatus.mediaType,
                        text: originalStatus.text,
                        backgroundColor: originalStatus.backgroundColor,
                        fontStyle: originalStatus.fontStyle,
                        mediaUrl: originalStatus.mediaUrl,
                        mediaThumbnail: originalStatus.mediaThumbnail,
                        audioUrl: originalStatus.audioUrl,
                        caption: `Reposted from ${originalStatus.authorName}`,
                        mood: originalStatus.mood,
                        mode: originalStatus.mode,
                        privacy: originalStatus.privacy,
                        privacyList: originalStatus.privacyList,
                        allowReplies: originalStatus.allowReplies,
                        allowLikes: originalStatus.allowLikes,
                        allowComments: originalStatus.allowComments,
                        viewedBy: '[]',
                        likes: 0,
                        comments: 0,
                        createdAt: now,
                        expiresAt: now + (24 * 60 * 60 * 1000)
                    };

                    this.db.run(
                        `INSERT INTO statuses (id, authorEmail, authorName, type, mediaType, text, backgroundColor, fontStyle, mediaUrl, mediaThumbnail, audioUrl, caption, mood, mode, privacy, privacyList, allowReplies, allowLikes, allowComments, viewedBy, likes, comments, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            newStatus.id, newStatus.authorEmail, newStatus.authorName, newStatus.type, newStatus.mediaType,
                            newStatus.text, newStatus.backgroundColor, newStatus.fontStyle, newStatus.mediaUrl, newStatus.mediaThumbnail,
                            newStatus.audioUrl, newStatus.caption, newStatus.mood, newStatus.mode, newStatus.privacy,
                            newStatus.privacyList, newStatus.allowReplies, newStatus.allowLikes, newStatus.allowComments,
                            JSON.stringify(newStatus.viewedBy), newStatus.likes, newStatus.comments, newStatus.createdAt, newStatus.expiresAt
                        ],
                        function(err) {
                            if (err) reject(err);
                            else resolve(newStatus);
                        }
                    );
                }
            );
        });
    }

    async isFollowing(followerEmail, followingEmail) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM follows WHERE followerEmail = ? AND followingEmail = ?',
                [followerEmail, followingEmail],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(!!row);
                }
            );
        });
    }

    // Close database connection
    close() {
        this.db.close();
    }
}

const instance = new Database();
instance.Database = Database;
module.exports = instance;
