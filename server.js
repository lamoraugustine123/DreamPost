const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const database = require('./database');
const { Pool } = require('pg');

// Supabase PostgreSQL Connection
const supabasePool = new Pool({
    connectionString: 'postgresql://postgres:Mrlamoraugustine@123@db.upkwtzufdedsfjklzmdq.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false },
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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 auth requests per window (increased for testing)
    message: {
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many authentication attempts. Please try again later.',
            retryAfter: 900
        });
    }
});

// Enable CORS for cross-origin requests from browser preview
app.use(cors({
    origin: true, // Allow all origins for development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply general rate limiting to all requests
app.use(generalLimiter);

app.use(express.json({ limit: '10mb' }));

// Serve static files with aggressive caching
app.use(express.static(__dirname, {
    maxAge: '1h',
    etag: true,
    lastModified: true
}));

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

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`DreamPost server running at http://localhost:${port}`);
    console.log(`Access from other devices: http://192.168.43.92:${port}`);
});
