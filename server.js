const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3003;
const dbPath = path.join(__dirname, 'dreampost.db');

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

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    const schema = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error creating database schema:', err.message);
        } else {
            console.log('Database schema created successfully.');
        }
    });
}

// Database helper functions
function getUserByEmail(email, callback) {
    db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()], callback);
}

function createUser(user, callback) {
    const stmt = db.prepare('INSERT INTO users (id, name, email, password, salt, joinedAt, badgeShareCount, bio, profileImage, coverImage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run([user.id, user.name, user.email, user.password, user.salt, user.joinedAt, user.badgeShareCount || 0, user.bio || null, user.profileImage || null, user.coverImage || null], callback);
    stmt.finalize();
}

function getPosts(callback) {
    db.all('SELECT p.*, GROUP_CONCAT(l.userEmail) as likedBy FROM posts p LEFT JOIN likes l ON p.id = l.postId WHERE p.public = 1 GROUP BY p.id ORDER BY p.createdAt DESC', callback);
}

function createPost(post, callback) {
    const stmt = db.prepare('INSERT INTO posts (id, title, text, mood, image, public, authorEmail, authorName, likes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run([post.id, post.title, post.text, post.mood, post.image, post.public ? 1 : 0, post.authorEmail, post.authorName, post.likes || 0, post.createdAt], callback);
    stmt.finalize();
}

function updatePost(postId, changes, callback) {
    const fields = Object.keys(changes);
    const values = Object.values(changes);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const stmt = db.prepare(`UPDATE posts SET ${setClause} WHERE id = ?`);
    stmt.run([...values, postId], callback);
    stmt.finalize();
}

app.get('/api/users', (req, res) => {
    const email = req.query.email;
    if (email) {
        getUserByEmail(email, (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (user) {
                // Remove sensitive data
                const { password, salt, ...safeUser } = user;
                return res.json(safeUser);
            }
            res.json(null);
        });
    } else {
        db.all('SELECT id, name, email, joinedAt, badgeShareCount, bio, profileImage, coverImage FROM users', (err, users) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(users);
        });
    }
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
    
    // Check if user already exists
    getUserByEmail(sanitizedEmail, (err, existing) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
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
        
        createUser(user, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to create user' });
            }
            // Remove sensitive data from response
            const { password, salt, ...safeUser } = user;
            res.json(safeUser);
        });
    });
});

app.post('/api/login', authLimiter, (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Missing login fields.' });
    }
    
    getUserByEmail(email.toLowerCase(), (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        
        // Verify hashed password
        if (!verifyPassword(password, user.salt, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        
        // Remove sensitive data from response
        const { password: pwd, salt, ...safeUser } = user;
        res.json(safeUser);
    });
});

app.get('/api/posts', (req, res) => {
    getPosts((err, posts) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Process posts to match expected format
        const processedPosts = posts.map(post => ({
            ...post,
            likedBy: post.likedBy ? post.likedBy.split(',') : [],
            public: Boolean(post.public)
        }));
        
        res.json(processedPosts);
    });
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
        createdAt: Date.now(),
    };
    
    createPost(post, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to create post' });
        }
        res.json(post);
    });
});

app.put('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    const changes = req.body;
    
    // Remove sensitive fields that shouldn't be updated directly
    const { id: _, createdAt, ...safeChanges } = changes;
    
    updatePost(id, safeChanges, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to update post' });
        }
        
        // Return updated post
        db.get('SELECT * FROM posts WHERE id = ?', [id], (err, post) => {
            if (err || !post) {
                return res.status(404).json({ error: 'Post not found.' });
            }
            res.json(post);
        });
    });
});

// Profile information update endpoint
app.put('/api/users/profile-info', async (req, res) => {
    const { email, name, bio, website, location } = req.body;
    
    if (!email || !name) {
        return res.status(400).json({ error: 'Email and name are required' });
    }
    
    db.run('UPDATE users SET name = ?, bio = ?, website = ?, location = ? WHERE email = ?', 
        [name, bio || null, website || null, location || null, email], (err) => {
        if (err) {
            console.error('Error updating profile info:', err);
            return res.status(500).json({ error: 'Failed to update profile information' });
        }
        
        console.log(`Profile info updated for user: ${email}`, { name, bio, website, location });
        res.json({ success: true, message: 'Profile information updated successfully' });
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`DreamPost server running at http://localhost:${port}`);
});