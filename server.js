const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const database = require('./database');

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
app.use(express.static(__dirname));

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
        const posts = await database.getAllPosts();
        
        // Get comments for each post
        const postsWithComments = await Promise.all(
            posts.map(async (post) => {
                const comments = await database.getCommentsByPostId(post.id);
                return {
                    ...post,
                    comments: comments
                };
            })
        );
        
        return postsWithComments;
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
    const { name, email, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Missing signup fields.' });
    }
    
    // Validate and sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    
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
        // Check if user already exists
        const existing = await database.getUserByEmail(sanitizedEmail);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered.' });
        }
        
        const { salt, hash } = hashPassword(password);
        const user = {
            id: Date.now().toString(),
            name: sanitizedName,
            email: sanitizedEmail,
            password: hash,
            salt,
            joinedAt: Date.now(),
            badgeShareCount: 0,
        };
        
        await createUser(user);
        
        // Remove sensitive data from response
        const { password: userPassword, salt: userSalt, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
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
        const processedPosts = posts.map(post => ({
            ...post,
            likedBy: post.likedBy || [],
            public: Boolean(post.public)
        }));
        
        res.json(processedPosts);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/posts', async (req, res) => {
    const { title, text, mood, image, public: isPublic, authorEmail, authorName } = req.body;
    
    // Validate required fields
    if (!text || !authorEmail || !authorName) {
        return res.status(400).json({ error: 'Missing post fields.' });
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
    
    if (!validateEmail(sanitizedAuthorEmail)) {
        return res.status(400).json({ error: 'Invalid author email format.' });
    }
    
    const validMoods = ['Joyful', 'Determined', 'Peaceful', 'Inspired', 'Confident'];
    if (!validMoods.includes(sanitizedMood)) {
        return res.status(400).json({ error: 'Invalid mood selection.' });
    }
    
    const post = {
        id: Date.now().toString(),
        authorEmail: sanitizedAuthorEmail,
        authorName: sanitizedAuthorName,
        text: sanitizedText,
        mood: sanitizedMood,
        contentType: req.body.contentType || 'dream',
        public: !!isPublic,
        createdAt: Date.now(),
        imageUrl: image || null,
        videoUrl: null
    };
    
    try {
        await createPost(post);
        res.json(post);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to create post' });
    }
});

app.post('/api/posts/:id/comments', async (req, res) => {
    const { id } = req.params;
    const { text, authorEmail, authorName } = req.body;
    
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
            createdAt: Date.now()
        };
        
        await database.addComment(comment);
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
        await database.updateUserProfile(email, { name, bio, website, location });
        console.log(`Profile info updated for user: ${email}`, { name, bio, website, location });
        res.json({ success: true, message: 'Profile information updated successfully' });
    } catch (error) {
        console.error('Error updating profile info:', error);
        return res.status(500).json({ error: 'Failed to update profile information' });
    }
});

// Profile image update endpoint
app.put('/api/users/profile-image', async (req, res) => {
    const { email, profileImage } = req.body;
    
    if (!email || !profileImage) {
        return res.status(400).json({ error: 'Email and profile image are required' });
    }
    
    try {
        await database.updateUserProfile(email, { profileImage });
        console.log(`Profile image updated for user: ${email}`);
        res.json({ success: true, message: 'Profile image updated successfully' });
    } catch (error) {
        console.error('Error updating profile image:', error);
        return res.status(500).json({ error: 'Failed to update profile image' });
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

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`DreamPost server running at http://localhost:${port}`);
    console.log(`Access from other devices: http://YOUR_LOCAL_IP:${port}`);
});