-- Supabase PostgreSQL Schema for DreamPost Platform
-- This schema matches the SQLite structure for dual database compatibility

-- Enable UUID extension for Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'staff', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    likes INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Activities table for admin dashboard
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT,
    action TEXT NOT NULL CHECK (action IN ('login', 'signup', 'post', 'like', 'comment', 'view')),
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Admin roles table for role-based access control
CREATE TABLE IF NOT EXISTS admin_roles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT UNIQUE NOT NULL CHECK (role_name IN ('admin', 'staff', 'user')),
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles mapping (for flexible role assignment)
CREATE TABLE IF NOT EXISTS user_roles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, role_id)
);

-- Analytics cache table for performance
CREATE TABLE IF NOT EXISTS analytics_cache (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    date_bucket TEXT NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(metric_name, date_bucket)
);

-- Follows table for user follow relationships
CREATE TABLE IF NOT EXISTS follows (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_email TEXT NOT NULL,
    following_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (follower_email) REFERENCES users(email) ON DELETE CASCADE,
    FOREIGN KEY (following_email) REFERENCES users(email) ON DELETE CASCADE,
    UNIQUE(follower_email, following_email)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_email);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_email);

-- System logs for monitoring
CREATE TABLE IF NOT EXISTS system_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    log_level TEXT NOT NULL CHECK (log_level IN ('ERROR', 'WARN', 'INFO', 'DEBUG')),
    message TEXT NOT NULL,
    context JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    service TEXT DEFAULT 'api'
);

-- Insert default admin roles
INSERT INTO admin_roles (role_name, permissions) VALUES 
('admin', '{"users": ["create", "read", "update", "delete"], "posts": ["create", "read", "update", "delete"], "analytics": ["read"], "system": ["read", "update"]}') 
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO admin_roles (role_name, permissions) VALUES 
('staff', '{"users": ["read", "update"], "posts": ["create", "read", "update"], "analytics": ["read"], "system": ["read"]}') 
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO admin_roles (role_name, permissions) VALUES 
('user', '{"users": ["read"], "posts": ["create", "read", "update"], "analytics": [], "system": []}') 
ON CONFLICT (role_name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON posts(updated_at);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_action ON activities(action);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_metric ON analytics_cache(metric_name, date_bucket);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(log_level);

-- Create views for common queries
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.created_at,
    u.last_login,
    u.login_count,
    COUNT(p.id) as post_count,
    MAX(p.created_at) as last_post_date
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id, u.name, u.email, u.role, u.created_at, u.last_login, u.login_count;

CREATE OR REPLACE VIEW activity_summary AS
SELECT 
    DATE_TRUNC('day', timestamp) as activity_date,
    action,
    COUNT(*) as activity_count,
    COUNT(DISTINCT user_id) as unique_users
FROM activities
GROUP BY DATE_TRUNC('day', timestamp), action
ORDER BY activity_date DESC;

-- Row Level Security (RLS) policies for Supabase
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id);

-- Posts visibility policies
CREATE POLICY "Users can view all posts" ON posts
    FOR SELECT USING (true); -- Public posts

CREATE POLICY "Users can insert own posts" ON posts
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own posts" ON posts
    FOR DELETE USING (auth.uid()::text = user_id);

-- Activities policies (admin only)
CREATE POLICY "Admins can view all activities" ON activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN admin_roles ar ON ur.role_id = ar.id 
            WHERE ur.user_id = auth.uid()::text 
            AND ar.role_name = 'admin'
        )
    );

-- Functions for analytics
CREATE OR REPLACE FUNCTION update_analytics_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user count cache
    INSERT INTO analytics_cache (metric_name, metric_value, date_bucket)
    VALUES ('total_users', (SELECT COUNT(*) FROM users), 'daily')
    ON CONFLICT (metric_name, date_bucket) 
    DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = NOW();
    
    -- Update post count cache
    INSERT INTO analytics_cache (metric_name, metric_value, date_bucket)
    VALUES ('total_posts', (SELECT COUNT(*) FROM posts), 'daily')
    ON CONFLICT (metric_name, date_bucket) 
    DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = NOW();
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update analytics cache
CREATE OR REPLACE TRIGGER update_analytics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_cache();

CREATE OR REPLACE TRIGGER update_analytics_trigger_posts
    AFTER INSERT OR UPDATE OR DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_cache();
