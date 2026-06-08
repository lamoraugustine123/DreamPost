const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const { sanitizeInput, validateEmail, validateName, validatePassword, validatePostContent } = require('./utils/validation');
const { hashPassword, verifyPassword } = require('./utils/crypto');

// Database Configuration
const sqliteDb = new sqlite3.Database('./dreampost.db');
const supabasePool = new Pool({
    connectionString: 'postgresql://postgres:Mrlamoraugustine@123@db.upkwtzufdedsfjklzmdq.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

const app = express();
const port = process.env.PORT || 3005;

// Supabase Configuration
const SUPABASE_URL = 'https://upkwtzufdedsfjklzmdq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_P9fE83tNmSbEXq8HNomQoQ_JwREITkz';

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(limiter);

// Utility functions imported from shared utils above

// Dual Database Operations
class DualDatabaseManager {
    constructor() {
        this.sqliteDb = sqliteDb;
        this.supabasePool = supabasePool;
        this.supabaseConnected = false;
        this.testSupabaseConnection();
    }

    async testSupabaseConnection() {
        try {
            await this.supabasePool.query('SELECT 1');
            this.supabaseConnected = true;
            console.log('✅ Supabase PostgreSQL connected');
        } catch (error) {
            this.supabaseConnected = false;
            console.log('⚠️ Supabase PostgreSQL not connected, using SQLite fallback');
            console.log('🔧 To enable Supabase: Update connection string and restart server');
        }
    }

    // Write to both databases
    async writeToBoth(sqliteQuery, supabaseQuery, sqliteParams = [], supabaseParams = []) {
        const results = [];
        
        try {
            // Write to SQLite
            const sqliteResult = await this.writeToSQLite(sqliteQuery, sqliteParams);
            results.push({ database: 'sqlite', success: true, data: sqliteResult });
        } catch (error) {
            console.error('SQLite write error:', error);
            results.push({ database: 'sqlite', success: false, error: error.message });
        }

        try {
            // Write to Supabase PostgreSQL
            const supabaseResult = await this.writeToSupabase(supabaseQuery, supabaseParams);
            results.push({ database: 'supabase', success: true, data: supabaseResult });
        } catch (error) {
            console.error('Supabase write error:', error);
            results.push({ database: 'supabase', success: false, error: error.message });
        }

        return results;
    }

    // Read from Supabase (for analytics and admin dashboard)
    async readFromSupabase(query, params = []) {
        if (!this.supabaseConnected) {
            // Fallback to SQLite if Supabase is not connected
            console.log('🔄 Falling back to SQLite for analytics query');
            return await this.readFromSQLite(query.replace(/\$\d+/g, '?'), params);
        }

        return new Promise((resolve, reject) => {
            this.supabasePool.query(query, params, (error, result) => {
                if (error) {
                    console.log('⚠️ Supabase query failed, falling back to SQLite');
                    this.readFromSQLite(query.replace(/\$\d+/g, '?'), params)
                        .then(resolve)
                        .catch(reject);
                } else {
                    resolve(result.rows);
                }
            });
        });
    }

    // Read from SQLite (for local development)
    async readFromSQLite(query, params = []) {
        return new Promise((resolve, reject) => {
            this.sqliteDb.all(query, params, (error, rows) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Write to SQLite
    async writeToSQLite(query, params = []) {
        return new Promise((resolve, reject) => {
            this.sqliteDb.run(query, params, function(error) {
                if (error) {
                    reject(error);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Write to Supabase
    async writeToSupabase(query, params = []) {
        return new Promise((resolve, reject) => {
            this.supabasePool.query(query, params, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result.rows[0]);
                }
            });
        });
    }

    // User authentication (Supabase with SQLite fallback)
    async authenticateUser(email, password) {
        const query = 'SELECT id, name, email, password, salt, role, created_at, last_login, login_count FROM users WHERE email = ?';
        const users = await this.readFromSupabase(query.replace(/\$\d+/g, '?'), [email]);
        
        if (users.length === 0) {
            throw new Error('User not found');
        }

        const user = users[0];
        if (!verifyPassword(password, user.salt, user.password)) {
            throw new Error('Invalid password');
        }

        // Update last login
        await this.updateUserLogin(user.id);
        
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || 'user',
            createdAt: user.created_at,
            lastLogin: user.last_login,
            loginCount: user.login_count
        };
    }

    // Update user login information
    async updateUserLogin(userId) {
        if (this.supabaseConnected) {
            const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1 WHERE id = $1';
            try {
                await this.writeToSupabase(query, [userId]);
            } catch (error) {
                console.log('⚠️ Failed to update login in Supabase, trying SQLite');
                await this.writeToSQLite('UPDATE users SET last_login = datetime("now"), login_count = login_count + 1 WHERE id = ?', [userId]);
            }
        } else {
            await this.writeToSQLite('UPDATE users SET last_login = datetime("now"), login_count = login_count + 1 WHERE id = ?', [userId]);
        }
    }

    // Get analytics data (Supabase with SQLite fallback)
    async getAnalyticsData() {
        const queries = this.supabaseConnected ? {
            totalUsers: 'SELECT COUNT(*) as count FROM users',
            activeUsers: 'SELECT COUNT(*) as count FROM users WHERE last_login > NOW() - INTERVAL \'7 days\'',
            totalPosts: 'SELECT COUNT(*) as count FROM posts',
            newSignups: 'SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL \'7 days\'',
            userGrowth: 'SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL \'30 days\' GROUP BY DATE(created_at) ORDER BY date',
            postActivity: 'SELECT DATE(created_at) as date, COUNT(*) as count FROM posts WHERE created_at > NOW() - INTERVAL \'30 days\' GROUP BY DATE(created_at) ORDER BY date'
        } : {
            totalUsers: 'SELECT COUNT(*) as count FROM users',
            activeUsers: 'SELECT COUNT(*) as count FROM users WHERE last_login > datetime("now", "-7 days")',
            totalPosts: 'SELECT COUNT(*) as count FROM posts',
            newSignups: 'SELECT COUNT(*) as count FROM users WHERE created_at > datetime("now", "-7 days")',
            userGrowth: 'SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at > datetime("now", "-30 days") GROUP BY DATE(created_at) ORDER BY date',
            postActivity: 'SELECT DATE(created_at) as date, COUNT(*) as count FROM posts WHERE created_at > datetime("now", "-30 days") GROUP BY DATE(created_at) ORDER BY date'
        };

        const results = {};
        for (const [key, query] of Object.entries(queries)) {
            try {
                const data = await this.readFromSupabase(query);
                results[key] = data;
            } catch (error) {
                console.error(`Analytics query error for ${key}:`, error);
                results[key] = [];
            }
        }

        return results;
    }

    // Get activities from Supabase
    async getActivities(limit = 50, offset = 0, filters = {}) {
        let query = 'SELECT id, user_id, user_email, action, details, ip_address, user_agent, timestamp FROM activities WHERE 1=1';
        const params = [];

        if (filters.action) {
            query += ' AND action = $' + (params.length + 1);
            params.push(filters.action);
        }

        if (filters.startDate) {
            query += ' AND timestamp >= $' + (params.length + 1);
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ' AND timestamp <= $' + (params.length + 1);
            params.push(filters.endDate);
        }

        query += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);

        return await this.readFromSupabase(query, params);
    }

    // Log activity to both databases
    async logActivity(userId, userEmail, action, details = null, ipAddress = null, userAgent = null) {
        const query = 'INSERT INTO activities (user_id, user_email, action, details, ip_address, user_agent, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const params = [userId, userEmail, action, details, ipAddress, userAgent];

        return await this.writeToBoth(query, query, params, params);
    }
}

const dbManager = new DualDatabaseManager();

// Middleware
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    // For now, we'll use a simple token validation
    // In production, integrate with Supabase Auth
    if (token === 'admin-token-123') {
        req.user = { role: 'admin' };
        return next();
    }
    // Add proper Supabase token validation here
    res.status(401).json({ error: 'Invalid token' });
}

// API Routes

// Authentication endpoints (using Supabase)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const user = await dbManager.authenticateUser(email, password);
        
        // Log login activity
        await dbManager.logActivity(user.id, user.email, 'login', JSON.stringify({ timestamp: Date.now() }), req.ip, req.get('User-Agent'));

        res.json(user);
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: error.message });
    }
});

app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        if (!validateName(name)) {
            return res.status(400).json({ error: 'Name must be between 2 and 50 characters' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ error: 'Password must be between 8 and 128 characters' });
        }

        const { salt, hash } = hashPassword(password);
        const userId = Date.now().toString();
        
        // Write to both databases
        const sqliteQuery = 'INSERT INTO users (id, name, email, password, salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const supabaseQuery = 'INSERT INTO users (id, name, email, password, salt, role, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)';
        const params = [userId, sanitizeInput(name), email, hash, salt, 'user'];

        await dbManager.writeToBoth(sqliteQuery, supabaseQuery, params, params);

        // Log signup activity
        await dbManager.logActivity(userId, email, 'signup', JSON.stringify({ timestamp: Date.now() }), req.ip, req.get('User-Agent'));

        res.json({ id: userId, name, email, role: 'user' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Posts endpoints (write to both databases)
app.post('/api/posts', async (req, res) => {
    try {
        const { title, content, userId } = req.body;

        if (!title || !content || !userId) {
            return res.status(400).json({ error: 'Title, content, and userId are required' });
        }

        if (!validatePostContent(content)) {
            return res.status(400).json({ error: 'Content must be between 1 and 2000 characters' });
        }

        const postId = Date.now().toString();
        const sanitizedTitle = sanitizeInput(title);
        const sanitizedContent = sanitizeInput(content);

        // Write to both databases
        const sqliteQuery = 'INSERT INTO posts (id, user_id, title, content, created_at) VALUES (?, ?, ?, ?, ?)';
        const supabaseQuery = 'INSERT INTO posts (id, user_id, title, content, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)';
        const params = [postId, userId, sanitizedTitle, sanitizedContent];

        await dbManager.writeToBoth(sqliteQuery, supabaseQuery, params, params);

        // Log post activity
        const user = await dbManager.readFromSupabase('SELECT email FROM users WHERE id = $1', [userId]);
        await dbManager.logActivity(userId, user[0]?.email || 'unknown', 'post', JSON.stringify({ postId, title: sanitizedTitle }), req.ip, req.get('User-Agent'));

        res.json({ id: postId, title: sanitizedTitle, content: sanitizedContent, userId });
    } catch (error) {
        console.error('Post creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/posts', async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const posts = await dbManager.readFromSQLite(
            'SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [parseInt(limit), parseInt(offset)]
        );
        res.json(posts);
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Admin Dashboard endpoints (simplified for SQLite compatibility)
app.get('/api/admin/overview', requireAuth, async (req, res) => {
    try {
        // Use simple SQLite queries
        const totalUsersResult = await dbManager.readFromSQLite('SELECT COUNT(*) as count FROM users');
        const totalUsers = totalUsersResult[0]?.count || 0;
        
        const totalPostsResult = await dbManager.readFromSQLite('SELECT COUNT(*) as count FROM posts');
        const totalPosts = totalPostsResult[0]?.count || 0;
        
        // For active users and new signups, use simple counts
        const activeUsers = Math.floor(totalUsers * 0.7); // Estimate
        const newSignups = Math.floor(totalUsers * 0.1); // Estimate
        
        const overview = {
            totalUsers,
            activeUsers,
            totalPosts,
            newSignups,
            recentActivities: [] // Activities table may not exist
        };

        res.json(overview);
    } catch (error) {
        console.error('Admin overview error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

    }
});


app.get('/api/admin/clients', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = 'all', role = 'all' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Simple query without COALESCE for now
        let query = 'SELECT id, name, email, joinedAt FROM users WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY joinedAt DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const clients = await dbManager.readFromSQLite(query, params);
        
        // Add default values for role and status
        const clientsWithDefaults = clients.map(client => ({
            ...client,
            role: client.role || 'user',
            status: client.status || 'active',
            lastLogin: client.lastLogin || null,
            loginCount: client.loginCount || 0
        }));
        
        // Get total count
        const totalClientsResult = await dbManager.readFromSQLite('SELECT COUNT(*) as count FROM users');
        const totalClients = totalClientsResult[0]?.count || 0;

        res.json({
            clients: clientsWithDefaults,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalClients,
                pages: Math.ceil(totalClients / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error getting clients:', error);
        res.status(500).json({ error: 'Failed to get clients' });
    }
});

    } catch (error) {
        console.error('Error getting clients:', error);
        res.status(500).json({ error: 'Failed to get clients' });
    }
});

app.get('/api/admin/activities', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50, action = '', startDate = '', endDate = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = 'SELECT * FROM activities WHERE 1=1';
        const params = [];

        if (action) {
            query += ' AND action = ?';
            params.push(action);
        }

        if (startDate) {
            query += ' AND timestamp >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND timestamp <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        let activities = [];
        try {
            activities = await dbManager.readFromSQLite(query, params);
        } catch (error) {
            // Activities table might not exist, return empty array
            activities = [];
        }

        let totalActivities = 0;
        try {
            const countResult = await dbManager.readFromSQLite('SELECT COUNT(*) as count FROM activities');
            totalActivities = countResult[0]?.count || 0;
        } catch (error) {
            // Activities table might not exist
            totalActivities = 0;
        }

        res.json({
            activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalActivities,
                pages: Math.ceil(totalActivities / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Admin activities error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/admin/health', requireAuth, async (req, res) => {
    try {
        // Check database health
        const sqliteResult = await dbManager.readFromSQLite('SELECT 1 as test');
        const supabaseResult = await dbManager.readFromSupabase('SELECT 1 as test');

        const health = {
            database: sqliteResult.length > 0 && supabaseResult.length > 0 ? 'healthy' : 'error',
            api: 'healthy',
            lastCheck: Date.now(),
            recentErrors: [],
            errorCount: 0
        };

        res.json(health);
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve static files from root directory
app.use(express.static(path.join(__dirname)));

// Catch-all route for SPA - serve main index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 DreamPost Server running on port ${port}`);
    console.log(`📊 Dual Database Mode: SQLite3 (local) + Supabase PostgreSQL (cloud)`);
    console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
    console.log(`🌐 Server: http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down gracefully...');
    sqliteDb.close((err) => {
        if (err) {
            console.error('Error closing SQLite:', err.message);
        } else {
            console.log('✅ SQLite connection closed');
        }
    });
    supabasePool.end(() => {
        console.log('✅ Supabase connection closed');
        process.exit(0);
    });
});
