const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3002;
const dataPath = path.join(__dirname, 'data.json');

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
    max: 5, // Limit each IP to 5 auth requests per window
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

// Apply general rate limiting to all requests
app.use(generalLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

function readData() {
    try {
        return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (error) {
        return { users: [], posts: [] };
    }
}

function writeData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

app.get('/api/users', (req, res) => {
    const data = readData();
    const email = req.query.email;
    if (email) {
        const user = data.users.find(u => u.email === email.toLowerCase());
        return res.json(user || null);
    }
    res.json(data.users);
});

app.post('/api/signup', authLimiter, (req, res) => {
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
    
    const data = readData();
    const existing = data.users.find(u => u.email === sanitizedEmail);
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
    data.users.push(user);
    writeData(data);
    res.json({ ...user, password: undefined, salt: undefined });
});

app.post('/api/login', authLimiter, (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Missing login fields.' });
    }
    const data = readData();
    const user = data.users.find(u => u.email === email.toLowerCase());
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    // Handle legacy users without salt (plain text passwords)
    if (!user.salt) {
        if (user.password === password) {
            // Upgrade to hashed password
            const { salt, hash } = hashPassword(password);
            user.password = hash;
            user.salt = salt;
            writeData(data);
            return res.json({ ...user, password: undefined, salt: undefined });
        } else {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
    }
    
    // Verify hashed password
    if (!verifyPassword(password, user.salt, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    res.json({ ...user, password: undefined, salt: undefined });
});

app.get('/api/posts', (req, res) => {
    const data = readData();
    res.json(data.posts || []);
});

app.post('/api/posts', (req, res) => {
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
    
    const data = readData();
    const post = {
        id: Date.now().toString(),
        title: sanitizedTitle,
        text: sanitizedText,
        mood: sanitizedMood,
        image: image || null,
        public: !!isPublic,
        authorEmail: sanitizedAuthorEmail,
        authorName: sanitizedAuthorName,
        likes: 0,
        likedBy: [],
        comments: [],
        createdAt: Date.now(),
    };
    data.posts.push(post);
    writeData(data);
    res.json(post);
});

app.put('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    const data = readData();
    const post = data.posts.find(p => p.id === id);
    if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
    }
    const fields = req.body;
    Object.assign(post, fields);
    writeData(data);
    res.json(post);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`DreamPost server running at http://localhost:${port}`);
});