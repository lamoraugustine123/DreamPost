-- DreamPost Admin Dashboard Database Schema
-- Extends existing database with admin functionality

-- Enhanced users table with role-based access control
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN lastLogin INTEGER;
ALTER TABLE users ADD COLUMN loginCount INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN adminNotes TEXT;

-- Admin roles and permissions
CREATE TABLE IF NOT EXISTS admin_roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    permissions TEXT, -- JSON array of permissions
    createdAt INTEGER NOT NULL
);

-- Activity logging for tracking all user actions
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userEmail TEXT,
    action TEXT NOT NULL, -- 'login', 'signup', 'post', 'like', 'comment', 'admin_action'
    details TEXT, -- JSON object with action details
    ipAddress TEXT,
    userAgent TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
);

-- System health and monitoring
CREATE TABLE IF NOT EXISTS system_logs (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL, -- 'info', 'warning', 'error', 'critical'
    message TEXT NOT NULL,
    details TEXT, -- JSON object with additional context
    endpoint TEXT,
    statusCode INTEGER,
    timestamp INTEGER NOT NULL
);

-- API health monitoring
CREATE TABLE IF NOT EXISTS api_health (
    id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    responseTime INTEGER, -- in milliseconds
    statusCode INTEGER,
    success INTEGER DEFAULT 1, -- 1 for success, 0 for failure
    timestamp INTEGER NOT NULL
);

-- Client analytics and metrics
CREATE TABLE IF NOT EXISTS client_analytics (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL, -- YYYY-MM-DD format
    totalUsers INTEGER DEFAULT 0,
    activeUsers INTEGER DEFAULT 0,
    newSignups INTEGER DEFAULT 0,
    totalPosts INTEGER DEFAULT 0,
    totalLikes INTEGER DEFAULT 0,
    totalComments INTEGER DEFAULT 0,
    timestamp INTEGER NOT NULL
);

-- Admin sessions for security
CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    adminId TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (adminId) REFERENCES users(id)
);

-- Insert default admin roles
INSERT OR IGNORE INTO admin_roles (id, name, permissions, createdAt) VALUES 
('admin', 'Administrator', '["all"]', 1700000000000),
('staff', 'Staff Member', '["view_clients", "view_activities", "view_analytics"]', 1700000000000),
('viewer', 'Viewer', '["view_analytics"]', 1700000000000);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(userId);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_api_health_timestamp ON api_health(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_health_endpoint ON api_health(endpoint);
CREATE INDEX IF NOT EXISTS idx_client_analytics_date ON client_analytics(date);
