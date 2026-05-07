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

    // Generic run method for custom queries
    async run(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ success: true, changes: this.changes, lastID: this.lastID });
            });
        });
    }

    // Close database connection
    close() {
        this.db.close();
    }
}

module.exports = new Database();
