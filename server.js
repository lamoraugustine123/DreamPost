require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const database = require('./database');
const { Pool } = require('pg');

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mp3|wav/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Supabase PostgreSQL Connection
const supabasePool = new Pool({
    host: process.env.SUPABASE_DB_HOST || 'db.upkwtzufdedsfjklzmdq.supabase.co',
    port: parseInt(process.env.SUPABASE_DB_PORT) || 5432,
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    user: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

// Supabase client helper (uses the pool for direct queries)
function createSupabaseClient() {
    return {
        from: (table) => ({
            insert: async (data) => supabasePool.query(
                `INSERT INTO ${table} (${Object.keys(data).join(', ')}) VALUES (${Object.keys(data).map((_, i) => '$' + (i + 1)).join(', ')})`,
                Object.values(data)
            ).catch(e => console.warn(`Supabase insert to ${table} failed:`, e.message)),
            update: (data) => ({
                eq: (col, val) => supabasePool.query(
                    `UPDATE ${table} SET ${Object.keys(data).map((k, i) => `${k} = $${i + 1}`).join(', ')} WHERE ${col} = $${Object.keys(data).length + 1}`,
                    [...Object.values(data), val]
                ).catch(e => console.warn(`Supabase update ${table} failed:`, e.message))
            }),
            delete: () => ({
                eq: (col1, val1) => ({
                    eq: (col2, val2) => supabasePool.query(
                        `DELETE FROM ${table} WHERE ${col1} = $1 AND ${col2} = $2`,
                        [val1, val2]
                    ).catch(e => console.warn(`Supabase delete from ${table} failed:`, e.message))
                })
            })
        })
    };
}

// ===== SERVER-SIDE CACHE =====
const serverCache = {
    posts: null,
    postsTimestamp: 0,
    postsTTL: 5000, // 5 seconds
    followCounts: new Map(),
    followCountsTTL: 10000, // 10 seconds
    
    getPostsCached: async function() {
        const now = Date.now();
        if (this.posts && (now - this.postsTimestamp) < this.postsTTL) {
            return this.posts;
        }
        this.posts = await database.getAllPostsWithComments();
        this.postsTimestamp = now;
        return this.posts;
    },
    
    invalidatePosts: function() {
        this.posts = null;
        this.postsTimestamp = 0;
    },
    
    getFollowCounts: async function(email) {
        const now = Date.now();
        const cached = this.followCounts.get(email);
        if (cached && (now - cached.timestamp) < this.followCountsTTL) {
            return cached.data;
        }
        const [followerCount, followingCount] = await Promise.all([
            database.getFollowerCount(email),
            database.getFollowingCount(email)
        ]);
        const data = { followerCount, followingCount };
        this.followCounts.set(email, { data, timestamp: now });
        return data;
    },
    
    invalidateFollowCounts: function(email) {
        this.followCounts.delete(email);
    }
};

// Fire-and-forget Supabase sync (never blocks the response)
function syncToSupabase(fn) {
    setImmediate(async () => {
        try {
            await fn();
        } catch (e) {
            console.warn('\u26a0\ufe0f Supabase background sync failed:', e.message);
        }
    });
}

const app = express();
const port = process.env.PORT || 3005;

// TextBee SMS Gateway configuration
const TEXTBEE_API_URL = process.env.TEXTBEE_API_URL || 'https://api.textbee.dev';
const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY || '';
const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID || '';

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-hashes'; " +
        "script-src-attr 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "media-src 'self' data: https:; " +
        "connect-src 'self'"
    );
    
    // HSTS for production
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    next();
});

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHmac('sha256', salt);
    hash.update(password);
    return { salt, hash: hash.digest('hex') };
}

function verifyPassword(password, salt, hash) {
    const newHash = crypto.createHmac('sha256', salt);
    newHash.update(password);
    return newHash.digest('hex') === hash;
}

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP for secure storage
function hashOTP(otp) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHmac('sha256', salt);
    hash.update(otp);
    return { salt, hash: hash.digest('hex') };
}

// Verify OTP
function verifyOTP(otp, salt, hash) {
    const newHash = crypto.createHmac('sha256', salt);
    newHash.update(otp);
    return newHash.digest('hex') === hash;
}

// Send SMS via TextBee Gateway
async function sendSMS(phoneNumber, message) {
    console.log(`📱 SMS Message: ${message}`);
    console.log(`📱 To: ${phoneNumber}`);

    if (TEXTBEE_API_KEY && TEXTBEE_DEVICE_ID) {
        try {
            const response = await fetch(
                `${TEXTBEE_API_URL}/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': TEXTBEE_API_KEY,
                    },
                    body: JSON.stringify({
                        recipients: [phoneNumber],
                        message: message,
                    }),
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`TextBee API error ${response.status}: ${errorBody}`);
            }

            console.log(`✅ SMS sent via TextBee to ${phoneNumber}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to send SMS via TextBee:', error);
        }
    }

    console.log('⚠️ TextBee not configured or SMS failed. Continuing with development mode (OTP logged above)');
    return true;
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim()
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, ''); // Remove event handlers
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateName(name) {
    return typeof name === 'string' && name.length >= 2 && name.length <= 50;
}

function validatePassword(password) {
    return typeof password === 'string' && 
           password.length >= 8 && 
           password.length <= 128;
}

function validatePostContent(text) {
    return typeof text === 'string' && 
           text.length >= 1 && 
           text.length <= 2000;
}

// Dual Database Helper Functions
async function writeToBoth(sqliteQuery, supabaseQuery, sqliteParams = [], supabaseParams = [], postData = null) {
    const results = [];
    
    try {
        // Write to SQLite
        const sqliteResult = await database.run(sqliteQuery, sqliteParams);
        results.push({ database: 'sqlite', success: true, data: sqliteResult });
    } catch (error) {
        console.error('SQLite write error:', error);
        results.push({ database: 'sqlite', success: false, error: error.message });
    }

    try {
        // Write to Supabase PostgreSQL
        const supabaseResult = await supabasePool.query(supabaseQuery, supabaseParams);
        results.push({ database: 'supabase', success: true, data: supabaseResult.rows[0] });
    } catch (error) {
        console.error('Supabase write error:', error);
        results.push({ database: 'supabase', success: false, error: error.message });
        
        // If Supabase fails and we have post data, save to pending_posts
        if (postData) {
            try {
                await database.addPendingPost({
                    ...postData,
                    error: error.message,
                    lastRetryAt: Date.now()
                });
                console.log('📝 Post saved to pending_posts for retry:', postData.id);
            } catch (pendingError) {
                console.error('Failed to save to pending_posts:', pendingError);
            }
        }
    }

    return results;
}

async function readFromSupabase(query, params = []) {
    try {
        const result = await supabasePool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Supabase read error, falling back to SQLite:', error);
        // Fallback to SQLite - use the correct database file (dreams.db)
        return new Promise((resolve, reject) => {
            const sqlite3 = require('sqlite3').verbose();
            const path = require('path');
            const dbPath = path.join(__dirname, 'dreams.db');
            const db = new sqlite3.Database(dbPath);
            
            const sqliteQuery = query.replace(/\$\d+/g, '?');
            
            if (sqliteQuery.toLowerCase().includes('select count(*)')) {
                db.get(sqliteQuery, params, (err, row) => {
                    db.close();
                    if (err) {
                        console.error('SQLite fallback error:', err);
                        resolve([{}]); // Return empty result
                    } else {
                        resolve([row || { count: 0 }]);
                    }
                });
            } else {
                db.all(sqliteQuery, params, (err, rows) => {
                    db.close();
                    if (err) {
                        console.error('SQLite fallback error:', err);
                        resolve([]); // Return empty result
                    } else {
                        resolve(rows || []);
                    }
                });
            }
        });
    }
}

async function logActivity(userId, userEmail, action, details = null, ipAddress = null, userAgent = null) {
    const query = 'INSERT INTO activities (user_id, user_email, action, details, ip_address, user_agent, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))';
    const params = [userId, userEmail, action, details, ipAddress, userAgent];

    return await writeToBoth(query, query, params, params);
}

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Advanced rate limiting with express-rate-limit
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per window
    message: {
        error: 'Too many requests from this IP. Please try again later.',
        retryAfter: 900 // 15 minutes in seconds
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: false, // Count successful requests
    skipFailedRequests: false, // Count failed requests
    keyGenerator: (req, res) => {
        return req.ip || req.connection.remoteAddress;
    },
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests. Please try again later.',
            retryAfter: 900
        });
    }
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 20, // Limit each IP to 20 auth requests per window
    message: {
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
});

// Rate limiter for password reset (stricter)
const passwordResetLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Limit each IP to 10 reset requests per window
    message: {
        error: 'Too many password reset attempts. Please try again later.',
        retryAfter: 300
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
});

// Enable CORS for cross-origin requests from browser preview
app.use(cors({
    origin: process.env.CORS_ORIGIN || true, // Allow all origins for development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Apply general rate limiting to all requests
// app.use(generalLimiter); // Disabled for development

app.use(express.json({ limit: '10mb' }));

// Initialize database
console.log('DreamPost server using SQLite3 database for storage')

// Database-based functions
async function createUser(userData) {
    try {
        return await database.createUser(userData);
    } catch (error) {
        throw error;
    }
}

async function getPosts() {
    try {
        // Use server cache + batch query (eliminates N+1)
        return await serverCache.getPostsCached();
    } catch (error) {
        throw error;
    }
}

async function createPost(postData) {
    try {
        return await database.createPost(postData);
    } catch (error) {
        throw error;
    }
}

async function updatePost(postId, changes) {
    try {
        if (changes.likes !== undefined && changes.likedBy !== undefined) {
            return await database.updatePostLikes(postId, changes.likes, changes.likedBy);
        }
        // Add other update operations as needed
        return { changes: 0 };
    } catch (error) {
        throw error;
    }
}

app.get('/api/users', async (req, res) => {
    const email = req.query.email;
    if (email) {
        try {
            const user = await database.getUserByEmail(email);
            if (user) {
                // Remove sensitive data
                const { password, salt, ...safeUser } = user;
                return res.json(safeUser);
            }
            res.json(null);
        } catch (error) {
            res.status(500).json({ error: 'Database error' });
        }
    } else {
        // For now, return empty array for all users request
        // In production, you might want to implement pagination
        res.json([]);
    }
});

app.post('/api/signup', authLimiter, async (req, res) => {
    const { name, email, password, phone } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !phone) {
        return res.status(400).json({ error: 'Missing signup fields.' });
    }
    
    // Validate and sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const sanitizedPhone = sanitizeInput(phone);
    
    if (!validateName(sanitizedName)) {
        return res.status(400).json({ error: 'Name must be between 2 and 50 characters.' });
    }
    
    if (!validateEmail(sanitizedEmail)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }
    
    if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
    }
    
    try {
        // Check if user already exists (check both databases)
        const existing = await database.getUserByEmail(sanitizedEmail);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered.' });
        }
        
        const { salt, hash } = hashPassword(password);
        const userId = Date.now().toString();
        
        // Dual-write user to both databases
        const sqliteQuery = 'INSERT INTO users (id, name, email, password, salt, joinedAt, badgeShareCount, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const supabaseQuery = 'INSERT INTO users (id, name, email, password, salt, joinedAt, badgeShareCount, phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
        const params = [userId, sanitizedName, sanitizedEmail, hash, salt, Date.now(), 0, sanitizedPhone];
        
        const results = await writeToBoth(sqliteQuery, supabaseQuery, params, params);
        
        // Log signup activity
        await logActivity(userId, sanitizedEmail, 'signup', JSON.stringify({ timestamp: Date.now() }), req.ip, req.get('User-Agent'));
        
        const user = {
            id: userId,
            name: sanitizedName,
            email: sanitizedEmail,
            password: hash,
            salt,
            joinedAt: Date.now(),
            badgeShareCount: 0,
            phone: sanitizedPhone,
        };
        
        // Remove sensitive data from response
        const { password: userPassword, salt: userSalt, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user name endpoint
app.post('/api/update-name', async (req, res) => {
    const { email, name } = req.body;
    console.log('👤 Updating user name:', { email, name });
    
    if (!email || !name) {
        return res.status(400).json({ error: 'Email and name are required' });
    }
    
    try {
        await database.updateUserName(email, name);
        console.log('✅ User name updated successfully');
        res.json({ success: true, message: 'User name updated successfully' });
    } catch (error) {
        console.error('❌ Error updating user name:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update profile image endpoint
app.post('/api/update-profile-image', async (req, res) => {
    const { email, profileImage } = req.body;
    console.log('📷 Updating profile image for:', email);
    
    if (!email || !profileImage) {
        return res.status(400).json({ error: 'Email and profile image are required' });
    }
    
    try {
        await database.updateUserProfileImage(email, profileImage);
        console.log('✅ Profile image updated successfully');
        res.json({ success: true, message: 'Profile image updated successfully' });
    } catch (error) {
        console.error('❌ Error updating profile image:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update cover image endpoint
app.post('/api/update-cover-image', async (req, res) => {
    const { email, coverImage } = req.body;
    console.log('🖼️ Updating cover image for:', email);
    
    if (!email || !coverImage) {
        return res.status(400).json({ error: 'Email and cover image are required' });
    }
    
    try {
        await database.updateUserCoverImage(email, coverImage);
        console.log('✅ Cover image updated successfully');
        res.json({ success: true, message: 'Cover image updated successfully' });
    } catch (error) {
        console.error('❌ Error updating cover image:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;
    console.log('🔑 Login attempt:', { email, passwordProvided: !!password });
    
    if (!email || !password) {
        console.log('❌ Missing login fields');
        return res.status(400).json({ error: 'Missing login fields.' });
    }
    
    try {
        const userEmail = email.toLowerCase();
        console.log('🔍 Looking for user:', userEmail);
        
        const user = await database.getUserByEmail(userEmail);
        console.log('👤 User found:', !!user);
        
        if (!user) {
            console.log('❌ User not found in database');
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        
        // Verify hashed password
        console.log('🔐 Verifying password...');
        const passwordMatch = verifyPassword(password, user.salt, user.password);
        console.log('✅ Password match:', passwordMatch);
        
        if (!passwordMatch) {
            console.log('❌ Password verification failed');
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        
        // Update last login and login count
        await database.updateUserLogin(user.id);
        
        // Log activity
        await database.logActivity(
            user.id,
            user.email,
            'login',
            { timestamp: Date.now() },
            req.ip,
            req.get('User-Agent')
        );
        
        // Remove sensitive data from response
        const { password: pwd, salt, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/posts', async (req, res) => {
    try {
        const posts = await getPosts();
        
        // Process posts to match expected format
        let processedPosts = posts.map(post => ({
            ...post,
            likedBy: post.likedBy || [],
            public: Boolean(post.public)
        }));
        
        // Filter by author if query parameter provided
        const authorEmail = req.query.author;
        if (authorEmail) {
            processedPosts = processedPosts.filter(post => post.authorEmail === authorEmail.toLowerCase());
        }
        
        res.json(processedPosts);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/posts', async (req, res) => {
    const { title, text, mood, image, imageUrl, public: isPublic, authorEmail, authorName } = req.body;
    
    // Validate required fields - allow anonymous posts
    if (!text || !authorName) {
        return res.status(400).json({ error: 'Missing post fields.' });
    }
    
    // Allow empty email only for anonymous posts
    if (!authorEmail && authorName !== 'Anonymous') {
        return res.status(400).json({ error: 'Author email is required for non-anonymous posts.' });
    }
    
    // Validate and sanitize inputs
    const sanitizedTitle = sanitizeInput(title) || 'Untitled Dream';
    const sanitizedText = sanitizeInput(text);
    const sanitizedAuthorName = sanitizeInput(authorName);
    const sanitizedAuthorEmail = sanitizeInput(authorEmail).toLowerCase();
    const sanitizedMood = sanitizeInput(mood) || 'Joyful';
    
    if (!validatePostContent(sanitizedText)) {
        return res.status(400).json({ error: 'Post content must be between 1 and 2000 characters.' });
    }
    
    if (!validateName(sanitizedAuthorName)) {
        return res.status(400).json({ error: 'Author name must be between 2 and 50 characters.' });
    }
    
    // Skip email validation for anonymous posts
    if (sanitizedAuthorName !== 'Anonymous' && !validateEmail(sanitizedAuthorEmail)) {
        return res.status(400).json({ error: 'Invalid author email format.' });
    }
    
    const validMoods = ['Joyful', 'Determined', 'Peaceful', 'Inspired', 'Confident', 'Magical', 'Mysterious', 'Adventurous', 'Romantic', 'Dark'];
    if (!validMoods.includes(sanitizedMood)) {
        return res.status(400).json({ error: 'Invalid mood selection.' });
    }
    
    const post = {
        id: Date.now().toString(),
        authorEmail: sanitizedAuthorName === 'Anonymous' ? '' : sanitizedAuthorEmail,
        authorName: sanitizedAuthorName,
        title: sanitizedTitle,
        text: sanitizedText,
        mood: sanitizedMood,
        contentType: req.body.contentType || 'dream',
        public: !!isPublic,
        createdAt: Date.now(),
        imageUrl: imageUrl || image || null,
        videoUrl: null,
        likes: 0,
        likedBy: [],
        comments: []
    };
    
    try {
        // Dual-write post to both databases
        const sqliteQuery = 'INSERT INTO posts (id, authorEmail, authorName, title, text, mood, contentType, public, createdAt, image, videoUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const supabaseQuery = 'INSERT INTO posts (id, author_email, author_name, title, text, mood, content_type, public, created_at, image_url, video_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)';
        const params = [
            post.id,
            post.authorEmail,
            post.authorName,
            post.title,
            post.text,
            post.mood,
            post.contentType,
            post.public,
            post.createdAt,
            post.imageUrl, // This will be stored in the 'image' column for SQLite
            post.videoUrl
        ];
        
        const results = await writeToBoth(sqliteQuery, supabaseQuery, params, params);
        
        // Log activity
        await logActivity(
            null, // userId (we'll get it from email)
            sanitizedAuthorEmail,
            'post',
            JSON.stringify({ postId: post.id, title: sanitizedTitle }),
            req.ip,
            req.get('User-Agent')
        );
        
        serverCache.invalidatePosts();
        res.json(post);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to create post' });
    }
});

// Get single post with comments
app.get('/api/posts/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const post = await database.getPostById(id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }
        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

app.post('/api/posts/:id/comments', async (req, res) => {
    const { id } = req.params;
    const { text, authorEmail, authorName, parentId } = req.body;
    
    if (!text || !authorEmail || !authorName) {
        return res.status(400).json({ error: 'Missing comment fields.' });
    }
    
    try {
        const comment = {
            id: Date.now().toString(),
            postId: id,
            authorEmail: sanitizeInput(authorEmail).toLowerCase(),
            authorName: sanitizeInput(authorName),
            text: sanitizeInput(text),
            createdAt: Date.now(),
            parentId: parentId || null
        };
        
        await database.addComment(comment);
        serverCache.invalidatePosts();
        res.json(comment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

app.put('/api/posts/:id', async (req, res) => {
    const { id } = req.params;
    const changes = req.body;
    
    // Remove sensitive fields that shouldn't be updated directly
    const { id: _, createdAt, ...safeChanges } = changes;
    
    try {
        await updatePost(id, safeChanges);
        serverCache.invalidatePosts();
        
        // Return updated post
        const post = await database.getPostById(id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }
        res.json(post);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update post' });
    }
});

// Profile information update endpoint
app.put('/api/users/profile-info', async (req, res) => {
    const { email, name, bio, website, location } = req.body;
    
if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
}
    
try {
    // Update in SQLite (primary, fast)
    await database.updateUserProfile(email, { name, bio, website, location });
    
    // Sync to Supabase (fire-and-forget)
    syncToSupabase(() => {
        const supabaseClient = createSupabaseClient();
        return supabaseClient.from('users').update({ name, bio, website, location }).eq('email', email);
    });
        
    res.json({ success: true, message: 'Profile updated successfully' });
} catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
}
});

// Follow user endpoint
app.post('/api/users/follow', async (req, res) => {
const { followerEmail, followingEmail } = req.body;
    
if (!followerEmail || !followingEmail) {
    return res.status(400).json({ error: 'Follower and following emails are required' });
}
    
if (followerEmail === followingEmail) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
}
    
try {
    // Add follow relationship in SQLite (primary, fast)
    await database.addFollow(followerEmail, followingEmail);
    
    // Invalidate cached counts
    serverCache.invalidateFollowCounts(followerEmail);
    serverCache.invalidateFollowCounts(followingEmail);
    
    // Get updated counts (parallel)
    const [followerCount, followingCount] = await Promise.all([
        database.getFollowerCount(followingEmail),
        database.getFollowingCount(followerEmail)
    ]);
        
    // Fire-and-forget Supabase sync
    syncToSupabase(() => {
        const supabaseClient = createSupabaseClient();
        return supabaseClient.from('follows').insert({
            follower_email: followerEmail,
            following_email: followingEmail,
            created_at: new Date().toISOString()
        });
    });
        
    res.json({ success: true, message: 'User followed successfully', followerCount, followingCount });
} catch (error) {
    console.error('Follow error:', error);
    if (error.message && error.message.includes('UNIQUE constraint')) {
        const { followerCount, followingCount } = await serverCache.getFollowCounts(followingEmail);
        res.json({ success: true, message: 'Already following', followerCount, followingCount });
    } else {
        res.status(500).json({ error: 'Failed to follow user' });
    }
}
});

// Unfollow user endpoint
app.post('/api/users/unfollow', async (req, res) => {
const { followerEmail, followingEmail } = req.body;
    
if (!followerEmail || !followingEmail) {
    return res.status(400).json({ error: 'Follower and following emails are required' });
}
    
try {
    // Remove follow relationship in SQLite (primary, fast)
    await database.removeFollow(followerEmail, followingEmail);
    
    // Invalidate cached counts
    serverCache.invalidateFollowCounts(followerEmail);
    serverCache.invalidateFollowCounts(followingEmail);
    
    // Get updated counts (parallel)
    const [followerCount, followingCount] = await Promise.all([
        database.getFollowerCount(followingEmail),
        database.getFollowingCount(followerEmail)
    ]);
        
    // Fire-and-forget Supabase sync
    syncToSupabase(() => {
        const supabaseClient = createSupabaseClient();
        return supabaseClient.from('follows').delete().eq('follower_email', followerEmail).eq('following_email', followingEmail);
    });
        
    res.json({ success: true, message: 'User unfollowed successfully', followerCount, followingCount });
} catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
}
});

// Check follow status endpoint
app.get('/api/users/check-follow', async (req, res) => {
const { follower, following } = req.query;
    
if (!follower || !following) {
    return res.status(400).json({ error: 'Follower and following parameters are required' });
}
    
try {
    const isFollowing = await database.checkFollowStatus(follower, following);
    res.json({ isFollowing });
} catch (error) {
    console.error('Check follow status error:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
}
});

// Get followers count endpoint
app.get('/api/users/followers', async (req, res) => {
const { email } = req.query;
    
if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' });
}
    
try {
    const { followerCount, followingCount } = await serverCache.getFollowCounts(email);
    res.json({ count: followerCount, followerCount, followingCount });
} catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Failed to get follower count' });
}
});

// Get following count endpoint
app.get('/api/users/following', async (req, res) => {
const { email } = req.query;
    
if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' });
}
    
try {
    const followingCount = await database.getFollowingCount(email);
    res.json({ count: followingCount });
} catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Failed to get following count' });
}
});

// Get followers list endpoint
app.get('/api/users/followers-list', async (req, res) => {
const { email } = req.query;
    
if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' });
}
    
try {
    const followers = await database.getFollowersList(email);
    res.json({ followers });
} catch (error) {
    console.error('Get followers list error:', error);
    res.status(500).json({ error: 'Failed to get followers list' });
}
});

// Get following list endpoint
app.get('/api/users/following-list', async (req, res) => {
const { email } = req.query;
    
if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' });
}
    
try {
    const following = await database.getFollowingList(email);
    res.json({ following });
} catch (error) {
    console.error('Get following list error:', error);
    res.status(500).json({ error: 'Failed to get following list' });
}
});

// Profile image update endpoint
app.put('/api/users/profile-image', async (req, res) => {
    const { email, profileImage } = req.body;
    
    if (!email || !profileImage) {
        return res.status(400).json({ error: 'Email and profile image are required' });
    }
    
    try {
        console.log('🎬 [SERVER] Attempting to update profile image:', { email, profileImage });
        console.log('🎬 [SERVER] Profile image data structure:', JSON.stringify({ email, profileImage }, null, 2));
        await database.updateUserProfile(email, { profileImage });
        console.log('🎬 [SERVER] Profile image updated successfully');
        res.json({ success: true, message: 'Profile image updated successfully' });
    } catch (error) {
        console.error('❌ [SERVER] Error updating profile image:', error.message);
        console.error('❌ [SERVER] Error stack:', error.stack);
        console.error('❌ [SERVER] Profile image data that failed:', JSON.stringify({ email, profileImage }, null, 2));
        return res.status(500).json({ error: 'Failed to update profile image', details: error.message });
    }
});

// Cover image update endpoint
app.put('/api/users/cover-image', async (req, res) => {
    const { email, coverImage } = req.body;
    
    if (!email || !coverImage) {
        return res.status(400).json({ error: 'Email and cover image are required' });
    }
    
    try {
        await database.updateUserProfile(email, { coverImage });
        console.log(`Cover image updated for user: ${email}`);
        res.json({ success: true, message: 'Cover image updated successfully' });
    } catch (error) {
        console.error('Error updating cover image:', error);
        return res.status(500).json({ error: 'Failed to update cover image' });
    }
});

// ===== STATUS UPDATES API ENDPOINTS =====

// Get all active statuses (grouped by user)
app.get('/api/statuses', async (req, res) => {
    console.log('📨 GET /api/statuses received, userEmail:', req.query.userEmail);
    try {
        const userEmail = req.query.userEmail || null;
        const statuses = await database.getActiveStatuses(userEmail);
        console.log('📊 Statuses fetched:', statuses.length);
        
        // Group statuses by user (like WhatsApp)
        const grouped = {};
        for (const status of statuses) {
            if (!grouped[status.authorEmail]) {
                grouped[status.authorEmail] = {
                    authorEmail: status.authorEmail,
                    authorName: status.authorName,
                    profileImage: status.profileImage || null,
                    statuses: [],
                    latestAt: status.createdAt
                };
            }
            grouped[status.authorEmail].statuses.push(status);
            if (status.createdAt > grouped[status.authorEmail].latestAt) {
                grouped[status.authorEmail].latestAt = status.createdAt;
            }
        }

        // Sort groups by latest status time
        const result = Object.values(grouped).sort((a, b) => b.latestAt - a.latestAt);
        console.log('📤 Sending grouped statuses:', result.length);
        console.log('📤 Response data:', JSON.stringify(result, null, 2));
        res.json(result);
        console.log('✅ Response sent');
    } catch (error) {
        console.error('❌ Error getting statuses:', error);
        res.status(500).json({ error: 'Failed to get statuses' });
    }
});

// Get statuses for a specific user
app.get('/api/statuses/user', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    try {
        const statuses = await database.getStatusesByUser(email);
        res.json(statuses);
    } catch (error) {
        console.error('Error getting user statuses:', error);
        res.status(500).json({ error: 'Failed to get user statuses' });
    }
});

// Create a new status
// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        const fileType = req.file.mimetype.split('/')[0];

        res.json({
            success: true,
            fileUrl: fileUrl,
            fileName: req.file.filename,
            fileType: fileType,
            mimeType: req.file.mimetype,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Cleanup expired statuses every hour
setInterval(async () => {
    try {
        const result = await database.deleteExpiredStatuses();
        if (result.deletedCount > 0) {
            console.log(`Cleaned up ${result.deletedCount} expired statuses`);
        }
    } catch (error) {
        console.error('Error cleaning up expired statuses:', error);
    }
}, 60 * 60 * 1000); // 1 hour

// Manual cleanup endpoint
app.post('/api/cleanup-expired', async (req, res) => {
    try {
        const result = await database.deleteExpiredStatuses();
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (error) {
        console.error('Error cleaning up expired statuses:', error);
        res.status(500).json({ error: 'Cleanup failed' });
    }
});

app.post('/api/statuses', async (req, res) => {
    console.log('📨 POST /api/statuses received');
    const {
        type, mediaType, text, backgroundColor, fontStyle, mediaUrl, mediaThumbnail,
        audioUrl, caption, mood, mode, privacy, privacyList, allowReplies, allowLikes,
        allowComments, authorEmail, authorName
    } = req.body;

    if (!authorEmail || !authorName) {
        console.log('❌ Missing author info');
        return res.status(400).json({ error: 'Author email and name are required' });
    }

    if ((type === 'text' || mediaType === 'text') && !text) {
        console.log('❌ Missing text for text status');
        return res.status(400).json({ error: 'Text is required for text statuses' });
    }

    if ((type === 'image' || mediaType === 'image' || mediaType === 'video') && !mediaUrl) {
        console.log('❌ Missing media for media status');
        return res.status(400).json({ error: 'Media is required for media statuses' });
    }

    const now = Date.now();
    const status = {
        id: now.toString() + '-' + Math.random().toString(36).substr(2, 9),
        authorEmail: sanitizeInput(authorEmail).toLowerCase(),
        authorName: sanitizeInput(authorName),
        type: type || 'text',
        mediaType: mediaType || 'text',
        text: text ? sanitizeInput(text) : null,
        backgroundColor: backgroundColor || '#075e54',
        fontStyle: fontStyle || 'normal',
        mediaUrl: mediaUrl || null,
        mediaThumbnail: mediaThumbnail || null,
        audioUrl: audioUrl || null,
        caption: caption ? sanitizeInput(caption) : null,
        mood: mood || 'casual',
        mode: mode || 'privacy',
        privacy: privacy || 'contacts',
        privacyList: privacyList || '[]',
        allowReplies: allowReplies !== undefined ? allowReplies : 1,
        allowLikes: allowLikes !== undefined ? allowLikes : 1,
        allowComments: allowComments !== undefined ? allowComments : 1,
        createdAt: now,
        expiresAt: now + (24 * 60 * 60 * 1000) // 24 hours
    };

    try {
        console.log('💾 Saving status to database...');
        const savedStatus = await database.createStatus(status);
        console.log('✅ Status saved, sending response:', savedStatus.id);
        res.json(savedStatus);
        console.log('✅ Response sent');
    } catch (error) {
        console.error('❌ Error creating status:', error);
        res.status(500).json({ error: 'Failed to create status' });
    }
});

// Mark status as viewed
app.post('/api/statuses/:id/view', async (req, res) => {
    const { id } = req.params;
    const { viewerEmail } = req.body;

    if (!viewerEmail) {
        return res.status(400).json({ error: 'Viewer email is required' });
    }

    try {
        await database.markStatusViewed(id, viewerEmail);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking status viewed:', error);
        res.status(500).json({ error: 'Failed to mark status as viewed' });
    }
});

// Delete a status
app.delete('/api/statuses/:id', async (req, res) => {
    const { id } = req.params;
    const { authorEmail } = req.body;

    if (!authorEmail) {
        return res.status(400).json({ error: 'Author email is required' });
    }

    try {
        await database.deleteStatus(id, authorEmail);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting status:', error);
        res.status(500).json({ error: 'Failed to delete status' });
    }
});

// Like a status
app.post('/api/statuses/:id/like', async (req, res) => {
    const { id } = req.params;
    const { userEmail } = req.body;

    if (!userEmail) {
        return res.status(400).json({ error: 'User email is required' });
    }

    try {
        const result = await database.likeStatus(id, userEmail);
        res.json(result);
    } catch (error) {
        console.error('Error liking status:', error);
        res.status(500).json({ error: 'Failed to like status' });
    }
});

// Unlike a status
app.post('/api/statuses/:id/unlike', async (req, res) => {
    const { id } = req.params;
    const { userEmail } = req.body;

    if (!userEmail) {
        return res.status(400).json({ error: 'User email is required' });
    }

    try {
        const result = await database.unlikeStatus(id, userEmail);
        res.json(result);
    } catch (error) {
        console.error('Error unliking status:', error);
        res.status(500).json({ error: 'Failed to unlike status' });
    }
});

// Comment on a status
app.post('/api/statuses/:id/comment', async (req, res) => {
    const { id } = req.params;
    const { userEmail, userName, text } = req.body;

    if (!userEmail || !userName || !text) {
        return res.status(400).json({ error: 'User email, name, and comment text are required' });
    }

    try {
        const result = await database.commentOnStatus(id, userEmail, userName, text);
        res.json(result);
    } catch (error) {
        console.error('Error commenting on status:', error);
        res.status(500).json({ error: 'Failed to comment on status' });
    }
});

// Get comments for a status
app.get('/api/statuses/:id/comments', async (req, res) => {
    const { id } = req.params;

    try {
        const comments = await database.getStatusComments(id);
        res.json(comments);
    } catch (error) {
        console.error('Error getting status comments:', error);
        res.status(500).json({ error: 'Failed to get comments' });
    }
});

// Repost a status
app.post('/api/statuses/:id/repost', async (req, res) => {
    const { id } = req.params;
    const { authorEmail, authorName } = req.body;

    if (!authorEmail || !authorName) {
        return res.status(400).json({ error: 'Author email and name are required' });
    }

    try {
        const result = await database.repostStatus(id, authorEmail, authorName);
        res.json(result);
    } catch (error) {
        console.error('Error reposting status:', error);
        res.status(500).json({ error: 'Failed to repost status' });
    }
});

// ===== ADMIN DASHBOARD API ENDPOINTS =====

// Middleware to check admin permissions (simplified for testing)
function checkAdminPermission(requiredPermission) {
    return async (req, res, next) => {
        try {
            // For now, we'll use a simple token-based approach
            // In a real implementation, you'd use proper session management
            const authHeader = req.headers.authorization;
            
            if (!authHeader) {
                return res.status(401).json({ error: 'Authorization header required' });
            }

            // Extract token (for testing, we'll use the admin credentials)
            const token = authHeader.replace('Bearer ', '');
            
            if (token !== 'admin-token-123') {
                return res.status(401).json({ error: 'Invalid admin token' });
            }

            // Get admin user
            const user = await database.getUserByEmail('admin@dreampost.com');
            if (!user) {
                return res.status(401).json({ error: 'Admin user not found' });
            }

            // Check if user has admin role
            const role = await database.getAdminRole(user.role);
            if (!role) {
                // Try to map role names
                const roleMapping = {
                    'admin': 'Administrator',
                    'staff': 'Staff Member', 
                    'viewer': 'Viewer'
                };
                const mappedRoleName = roleMapping[user.role];
                if (mappedRoleName) {
                    const mappedRole = await database.getAdminRole(mappedRoleName);
                    if (!mappedRole) {
                        return res.status(403).json({ error: 'Insufficient permissions' });
                    }
                    req.adminUser = user;
                    req.adminRole = mappedRole;
                } else {
                    return res.status(403).json({ error: 'Insufficient permissions' });
                }
            } else {
                req.adminUser = user;
                req.adminRole = role;
            }

            // Check permissions
            const roleToCheck = req.adminRole || role;
            const permissions = JSON.parse(roleToCheck.permissions || '[]');
            if (permissions.includes('all') || permissions.includes(requiredPermission)) {
                return next();
            }

            return res.status(403).json({ error: 'Insufficient permissions' });
        } catch (error) {
            console.error('Admin permission check error:', error);
            return res.status(500).json({ error: 'Permission check failed' });
        }
    };
}

// Get overview statistics (using Supabase for analytics)
app.get('/api/admin/overview', checkAdminPermission('view_analytics'), async (req, res) => {
    try {
        // Use Supabase for analytics with SQLite fallback
        const queries = {
            totalUsers: 'SELECT COUNT(*) as count FROM users',
            activeUsers: 'SELECT COUNT(*) as count FROM users WHERE last_login > NOW() - INTERVAL \'7 days\'',
            totalPosts: 'SELECT COUNT(*) as count FROM posts',
            newSignups: 'SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL \'7 days\''
        };

        const stats = {};
        for (const [key, query] of Object.entries(queries)) {
            try {
                const result = await readFromSupabase(query);
                stats[key] = result[0]?.count || 0;
            } catch (error) {
                console.error(`Analytics query error for ${key}:`, error);
                stats[key] = 0;
            }
        }

        // Get recent activities
        try {
            const activities = await readFromSupabase('SELECT * FROM activities ORDER BY timestamp DESC LIMIT 5');
            stats.recentActivities = activities;
        } catch (error) {
            console.error('Recent activities error:', error);
            stats.recentActivities = [];
        }

        res.json(stats);
    } catch (error) {
        console.error('Error getting admin overview:', error);
        res.status(500).json({ error: 'Failed to get overview statistics' });
    }
});

// Get all clients with pagination and filtering (using Supabase)
app.get('/api/admin/clients', checkAdminPermission('view_clients'), async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = 'all', role = 'all' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = 'SELECT id, name, email, COALESCE(role, "user") as role, joinedAt as created_at, lastLogin as last_login, COALESCE(loginCount, 0) as login_count FROM users WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (name ILIKE $' + (params.length + 1) + ' OR email ILIKE $' + (params.length + 2) + ')';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (status !== 'all') {
            query += ' AND status = $' + (params.length + 1);
            params.push(status);
        }

        if (role !== 'all') {
            query += ' AND role = $' + (params.length + 1);
            params.push(role);
        }

        query += ' ORDER BY joinedAt DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(parseInt(limit), offset);

        const clients = await readFromSupabase(query, params);
        const totalClients = await readFromSupabase('SELECT COUNT(*) as count FROM users');

        res.json({
            clients,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalClients[0]?.count || 0,
                pages: Math.ceil((totalClients[0]?.count || 0) / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error getting clients:', error);
        res.status(500).json({ error: 'Failed to get clients' });
    }
});

// Get client details
app.get('/api/admin/clients/:id', checkAdminPermission('view_clients'), async (req, res) => {
    try {
        const { id } = req.params;
        const client = await database.getClientDetails(id);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(client);
    } catch (error) {
        console.error('Error getting client details:', error);
        res.status(500).json({ error: 'Failed to get client details' });
    }
});

// Update client status (activate/deactivate)
app.put('/api/admin/clients/:id/status', checkAdminPermission('manage_clients'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;
        
        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await database.updateClientStatus(id, { status, adminNotes });
        res.json({ success: true, message: 'Client status updated successfully' });
    } catch (error) {
        console.error('Error updating client status:', error);
        res.status(500).json({ error: 'Failed to update client status' });
    }
});

// Get activity logs with filtering (using Supabase)
app.get('/api/admin/activities', checkAdminPermission('view_activities'), async (req, res) => {
    try {
        const { page = 1, limit = 50, action = '', userId = '', startDate = '', endDate = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = 'SELECT id, user_id, user_email, action, details, ip_address, user_agent, timestamp FROM activities WHERE 1=1';
        const params = [];

        if (action) {
            query += ' AND action = $' + (params.length + 1);
            params.push(action);
        }

        if (userId) {
            query += ' AND user_id = $' + (params.length + 1);
            params.push(userId);
        }

        if (startDate) {
            query += ' AND timestamp >= $' + (params.length + 1);
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND timestamp <= $' + (params.length + 1);
            params.push(endDate);
        }

        query += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(parseInt(limit), offset);

        const activities = await readFromSupabase(query, params);
        const totalActivities = await readFromSupabase('SELECT COUNT(*) as count FROM activities');

        res.json({
            activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalActivities[0]?.count || 0,
                pages: Math.ceil((totalActivities[0]?.count || 0) / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error getting activities:', error);
        res.status(500).json({ error: 'Failed to get activities' });
    }
});

// Get analytics data
app.get('/api/admin/analytics', checkAdminPermission('view_analytics'), async (req, res) => {
    try {
        const { type = 'overview', period = '30d' } = req.query;
        const analytics = await database.getAnalytics(type, period);
        res.json(analytics);
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Get system health status
app.get('/api/admin/health', checkAdminPermission('view_system_health'), async (req, res) => {
    try {
        const health = await database.getSystemHealth();
        res.json(health);
    } catch (error) {
        console.error('Error getting system health:', error);
        res.status(500).json({ error: 'Failed to get system health' });
    }
});

// Export client data
app.get('/api/admin/export/clients', checkAdminPermission('export_data'), async (req, res) => {
    try {
        const { format = 'csv', status = 'all', role = 'all' } = req.query;
        const exportData = await database.exportClients({ format, status, role });
        
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=clients.csv');
            res.send(exportData);
        } else if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=clients.json');
            res.json(exportData);
        } else {
            res.status(400).json({ error: 'Unsupported export format' });
        }
    } catch (error) {
        console.error('Error exporting client data:', error);
        res.status(500).json({ error: 'Failed to export client data' });
    }
});

// Export activity data
app.get('/api/admin/export/activities', checkAdminPermission('export_data'), async (req, res) => {
    try {
        const { format = 'csv', startDate = '', endDate = '', action = '' } = req.query;
        const exportData = await database.exportActivities({ format, startDate, endDate, action });
        
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=activities.csv');
            res.send(exportData);
        } else if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=activities.json');
            res.json(exportData);
        } else {
            res.status(400).json({ error: 'Unsupported export format' });
        }
    } catch (error) {
        console.error('Error exporting activity data:', error);
        res.status(500).json({ error: 'Failed to export activity data' });
    }
});

// Password reset endpoints
app.post('/api/password-reset/request', passwordResetLimiter, async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    const sanitizedPhone = sanitizeInput(phone);

    try {
        // Check if user exists with this phone number
        const user = await database.getUserByPhone(sanitizedPhone);
        if (!user) {
            // Log the attempt but don't reveal if phone exists
            await database.logSecurityEvent('password_reset_request', sanitizedPhone, null, false, req.ip, req.get('User-Agent'), 'Phone not found');
            return res.status(200).json({ message: 'If the phone number is registered, you will receive an OTP' });
        }

        // Check for recent reset attempts (prevent spam)
        const recentReset = await database.getPasswordReset(sanitizedPhone);
        if (recentReset && recentReset.attempts >= 3) {
            await database.logSecurityEvent('password_reset_request', sanitizedPhone, user.email, false, req.ip, req.get('User-Agent'), 'Too many attempts');
            return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
        }

        // Generate and hash OTP
        const otp = generateOTP();
        const { salt, hash } = hashOTP(otp);

        // Store in database
        await database.createPasswordReset(sanitizedPhone, salt, hash, req.ip, req.get('User-Agent'));

        // Send SMS
        const message = `Your DreamPost password reset code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
        await sendSMS(sanitizedPhone, message);

        // Log success
        await database.logSecurityEvent('password_reset_request', sanitizedPhone, user.email, true, req.ip, req.get('User-Agent'), 'OTP sent');

        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Password reset request error:', error);
        await database.logSecurityEvent('password_reset_request', sanitizedPhone, null, false, req.ip, req.get('User-Agent'), error.message);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

app.post('/api/password-reset/verify', passwordResetLimiter, async (req, res) => {
    const { phone, otp, newPassword } = req.body;

    if (!phone || !otp || !newPassword) {
        return res.status(400).json({ error: 'Phone, OTP, and new password are required' });
    }

    const sanitizedPhone = sanitizeInput(phone);

    if (!validatePassword(newPassword)) {
        return res.status(400).json({ error: 'Password must be between 8 and 128 characters' });
    }

    try {
        // Get the reset record
        const resetRecord = await database.getPasswordReset(sanitizedPhone);
        if (!resetRecord) {
            await database.logSecurityEvent('password_reset_verify', sanitizedPhone, null, false, req.ip, req.get('User-Agent'), 'No valid reset request found');
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Check attempts
        if (resetRecord.attempts >= 3) {
            await database.logSecurityEvent('password_reset_verify', sanitizedPhone, null, false, req.ip, req.get('User-Agent'), 'Max attempts exceeded');
            await database.deletePasswordReset(resetRecord.id);
            return res.status(429).json({ error: 'Too many attempts. Please request a new OTP.' });
        }

        // Verify OTP (need to extract salt from stored hash - our hashOTP returns both salt and hash)
        // For simplicity, we'll store salt separately or use a different approach
        // Let's modify the storage to include salt
        const otpParts = resetRecord.otpHash.split(':');
        if (otpParts.length !== 2) {
            await database.logSecurityEvent('password_reset_verify', sanitizedPhone, null, false, req.ip, req.get('User-Agent'), 'Invalid hash format');
            return res.status(400).json({ error: 'Invalid OTP format' });
        }

        const storedSalt = otpParts[0];
        const storedHash = otpParts[1];

        if (!verifyOTP(otp, storedSalt, storedHash)) {
            await database.incrementResetAttempts(resetRecord.id);
            await database.logSecurityEvent('password_reset_verify', sanitizedPhone, null, false, req.ip, req.get('User-Agent'), 'Invalid OTP');
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // Get user
        const user = await database.getUserByPhone(sanitizedPhone);
        if (!user) {
            await database.logSecurityEvent('password_reset_verify', sanitizedPhone, null, false, req.ip, req.get('User-Agent'), 'User not found');
            return res.status(400).json({ error: 'User not found' });
        }

        // Update password
        const { salt: newSalt, hash: newHash } = hashPassword(newPassword);
        await database.updateUserPassword(user.email, newHash, newSalt);

        // Delete reset record
        await database.deletePasswordReset(resetRecord.id);

        // Log success
        await database.logSecurityEvent('password_reset_verify', sanitizedPhone, user.email, true, req.ip, req.get('User-Agent'), 'Password reset successful');

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Password reset verify error:', error);
        await database.logSecurityEvent('password_reset_verify', sanitizedPhone, null, false, req.ip, req.get('User-Agent'), error.message);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Password reset security endpoints for admin dashboard
app.get('/api/admin/security/password-resets', checkAdminPermission('view_activities'), async (req, res) => {
    try {
        const { page = 1, limit = 50, status = 'all', startDate = '', endDate = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = 'SELECT id, phone, expiresAt, attempts, createdAt, ipAddress, userAgent FROM password_resets WHERE 1=1';
        const params = [];

        if (startDate) {
            query += ' AND createdAt >= ?';
            params.push(new Date(startDate).getTime());
        }

        if (endDate) {
            query += ' AND createdAt <= ?';
            params.push(new Date(endDate).getTime());
        }

        if (status === 'active') {
            query += ' AND expiresAt > ?';
            params.push(Date.now());
        } else if (status === 'expired') {
            query += ' AND expiresAt <= ?';
            params.push(Date.now());
        }

        query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        database.db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching password resets:', err);
                return res.status(500).json({ error: 'Failed to fetch password resets' });
            }

            const countQuery = query.split('ORDER BY')[0].replace('SELECT id, phone, expiresAt, attempts, createdAt, ipAddress, userAgent', 'SELECT COUNT(*) as count');
            database.db.get(countQuery, params.slice(0, -2), (err, countRow) => {
                if (err) {
                    console.error('Error counting password resets:', err);
                    return res.status(500).json({ error: 'Failed to count password resets' });
                }

                res.json({
                    data: rows,
                    total: countRow.count,
                    page: parseInt(page),
                    limit: parseInt(limit)
                });
            });
        });
    } catch (error) {
        console.error('Error in password resets endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/admin/security/audit-logs', checkAdminPermission('view_activities'), async (req, res) => {
    try {
        const { page = 1, limit = 50, action = '', startDate = '', endDate = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = 'SELECT id, action, phone, email, success, ipAddress, userAgent, timestamp, details FROM security_audit_log WHERE 1=1';
        const params = [];

        if (action) {
            query += ' AND action LIKE ?';
            params.push(`%${action}%`);
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
        params.push(parseInt(limit), offset);

        database.db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching audit logs:', err);
                return res.status(500).json({ error: 'Failed to fetch audit logs' });
            }

            const countQuery = query.split('ORDER BY')[0].replace('SELECT id, action, phone, email, success, ipAddress, userAgent, timestamp, details', 'SELECT COUNT(*) as count');
            database.db.get(countQuery, params.slice(0, -2), (err, countRow) => {
                if (err) {
                    console.error('Error counting audit logs:', err);
                    return res.status(500).json({ error: 'Failed to count audit logs' });
                }

                res.json({
                    data: rows,
                    total: countRow.count,
                    page: parseInt(page),
                    limit: parseInt(limit)
                });
            });
        });
    } catch (error) {
        console.error('Error in audit logs endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/admin/security/statistics', checkAdminPermission('view_analytics'), async (req, res) => {
    try {
        const stats = {
            totalResets: 0,
            activeResets: 0,
            expiredResets: 0,
            successfulResets: 0,
            failedResets: 0,
            suspiciousAttempts: 0,
            last24hResets: 0,
            last7dResets: 0
        };

        const now = Date.now();
        const last24h = now - (24 * 60 * 60 * 1000);
        const last7d = now - (7 * 24 * 60 * 60 * 1000);

        database.db.get('SELECT COUNT(*) as count FROM password_resets', [], (err, row) => {
            if (!err && row) stats.totalResets = row.count;

            database.db.get('SELECT COUNT(*) as count FROM password_resets WHERE expiresAt > ?', [now], (err, row) => {
                if (!err && row) stats.activeResets = row.count;

                database.db.get('SELECT COUNT(*) as count FROM password_resets WHERE expiresAt <= ?', [now], (err, row) => {
                    if (!err && row) stats.expiredResets = row.count;

                    database.db.get('SELECT COUNT(*) as count FROM security_audit_log WHERE action = ? AND success = 1', ['password_reset_verify'], (err, row) => {
                        if (!err && row) stats.successfulResets = row.count;

                        database.db.get('SELECT COUNT(*) as count FROM security_audit_log WHERE action = ? AND success = 0', ['password_reset_verify'], (err, row) => {
                            if (!err && row) stats.failedResets = row.count;

                            database.db.get('SELECT COUNT(*) as count FROM password_resets WHERE attempts >= 3', [], (err, row) => {
                                if (!err && row) stats.suspiciousAttempts = row.count;

                                database.db.get('SELECT COUNT(*) as count FROM password_resets WHERE createdAt >= ?', [last24h], (err, row) => {
                                    if (!err && row) stats.last24hResets = row.count;

                                    database.db.get('SELECT COUNT(*) as count FROM password_resets WHERE createdAt >= ?', [last7d], (err, row) => {
                                        if (!err && row) stats.last7dResets = row.count;

                                        res.json(stats);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('Error in security statistics endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Cleanup expired resets every hour
setInterval(async () => {
    await database.cleanupExpiredResets();
}, 60 * 60 * 1000);

// Serve static files (must be after all API routes to avoid conflicts)
app.use(express.static(__dirname, {
    maxAge: '1h',
    etag: true,
    lastModified: true
}));

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`DreamPost server running at http://localhost:${port}`);
    console.log(`Access from other devices: http://192.168.43.92:${port}`);
});
