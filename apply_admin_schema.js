const Database = require('./database');

async function applyAdminSchema() {
    try {
        console.log('🔧 Applying admin database schema...');
        
        // Add admin columns to users table
        await new Promise((resolve, reject) => {
            Database.db.run('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"', (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
        
        await new Promise((resolve, reject) => {
            Database.db.run('ALTER TABLE users ADD COLUMN status TEXT DEFAULT "active"', (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
        
        await new Promise((resolve, reject) => {
            Database.db.run('ALTER TABLE users ADD COLUMN lastLogin INTEGER', (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
        
        await new Promise((resolve, reject) => {
            Database.db.run('ALTER TABLE users ADD COLUMN loginCount INTEGER DEFAULT 0', (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
        
        await new Promise((resolve, reject) => {
            Database.db.run('ALTER TABLE users ADD COLUMN adminNotes TEXT', (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
        
        // Create admin roles table
        await new Promise((resolve, reject) => {
            Database.db.run(`
                CREATE TABLE IF NOT EXISTS admin_roles (
                    id TEXT PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    permissions TEXT,
                    createdAt INTEGER NOT NULL
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Create activity logs table
        await new Promise((resolve, reject) => {
            Database.db.run(`
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id TEXT PRIMARY KEY,
                    userId TEXT,
                    userEmail TEXT,
                    action TEXT NOT NULL,
                    details TEXT,
                    ipAddress TEXT,
                    userAgent TEXT,
                    timestamp INTEGER NOT NULL,
                    FOREIGN KEY (userId) REFERENCES users(id)
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Create system logs table
        await new Promise((resolve, reject) => {
            Database.db.run(`
                CREATE TABLE IF NOT EXISTS system_logs (
                    id TEXT PRIMARY KEY,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    details TEXT,
                    endpoint TEXT,
                    statusCode INTEGER,
                    timestamp INTEGER NOT NULL
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Create API health table
        await new Promise((resolve, reject) => {
            Database.db.run(`
                CREATE TABLE IF NOT EXISTS api_health (
                    id TEXT PRIMARY KEY,
                    endpoint TEXT NOT NULL,
                    method TEXT NOT NULL,
                    responseTime INTEGER,
                    statusCode INTEGER,
                    success INTEGER DEFAULT 1,
                    timestamp INTEGER NOT NULL
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Create client analytics table
        await new Promise((resolve, reject) => {
            Database.db.run(`
                CREATE TABLE IF NOT EXISTS client_analytics (
                    id TEXT PRIMARY KEY,
                    date TEXT NOT NULL,
                    totalUsers INTEGER DEFAULT 0,
                    activeUsers INTEGER DEFAULT 0,
                    newSignups INTEGER DEFAULT 0,
                    totalPosts INTEGER DEFAULT 0,
                    totalLikes INTEGER DEFAULT 0,
                    totalComments INTEGER DEFAULT 0,
                    timestamp INTEGER NOT NULL
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Create admin sessions table
        await new Promise((resolve, reject) => {
            Database.db.run(`
                CREATE TABLE IF NOT EXISTS admin_sessions (
                    id TEXT PRIMARY KEY,
                    adminId TEXT NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    ipAddress TEXT,
                    userAgent TEXT,
                    expiresAt INTEGER NOT NULL,
                    createdAt INTEGER NOT NULL,
                    FOREIGN KEY (adminId) REFERENCES users(id)
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Insert default admin roles
        await new Promise((resolve, reject) => {
            Database.db.run(`
                INSERT OR IGNORE INTO admin_roles (id, name, permissions, createdAt) VALUES 
                ('admin', 'Administrator', '["all"]', 1700000000000),
                ('staff', 'Staff Member', '["view_clients", "view_activities", "view_analytics"]', 1700000000000),
                ('viewer', 'Viewer', '["view_analytics"]', 1700000000000)
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(userId)',
            'CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)',
            'CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level)',
            'CREATE INDEX IF NOT EXISTS idx_api_health_timestamp ON api_health(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_api_health_endpoint ON api_health(endpoint)',
            'CREATE INDEX IF NOT EXISTS idx_client_analytics_date ON client_analytics(date)'
        ];
        
        for (const indexSql of indexes) {
            await new Promise((resolve, reject) => {
                Database.db.run(indexSql, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        
        console.log('✅ Admin database schema applied successfully!');
        
        // Create a default admin user
        const adminEmail = 'admin@dreampost.com';
        const existingAdmin = await new Promise((resolve, reject) => {
            Database.db.get('SELECT * FROM users WHERE email = ?', [adminEmail], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!existingAdmin) {
            const adminId = Date.now().toString();
            const crypto = require('crypto');
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.createHmac('sha256', salt);
            hash.update('admin123456');
            const passwordHash = hash.digest('hex');
            
            await new Promise((resolve, reject) => {
                Database.db.run(`
                    INSERT INTO users (id, name, email, password, salt, role, status, joinedAt, loginCount) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [adminId, 'Admin User', adminEmail, passwordHash, salt, 'admin', 'active', Date.now(), 0], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            console.log('👤 Default admin user created: admin@dreampost.com / admin123456');
        }
        
        console.log('🎉 Admin dashboard setup complete!');
        
    } catch (error) {
        console.error('❌ Error applying admin schema:', error);
    } finally {
        Database.close();
    }
}

applyAdminSchema();
