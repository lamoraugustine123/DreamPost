const { Pool } = require('pg');
const database = require('./database');

// Supabase PostgreSQL Connection
const supabasePool = new Pool({
    connectionString: 'postgresql://postgres:Mrlamoraugustine@123@db.upkwtzufdedsfjklzmdq.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

class SyncWorker {
    constructor() {
        this.isRunning = false;
        this.retryInterval = null;
    }

    // Exponential backoff calculation
    calculateBackoff(retryCount) {
        const delays = [1000, 5000, 30000, 300000]; // 1s, 5s, 30s, 5min
        return delays[Math.min(retryCount, delays.length - 1)];
    }

    async retryPendingPost(post) {
        const retryCount = post.retryCount || 0;
        const delay = this.calculateBackoff(retryCount);
        
        console.log(`🔄 Retrying post ${post.id} (attempt ${retryCount + 1}) after ${delay}ms`);
        
        // Wait for the backoff delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
            // Attempt to write to Supabase
            const supabaseQuery = 'INSERT INTO posts (id, author_email, author_name, title, text, mood, content_type, public, created_at, image_url, video_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
            const supabaseParams = [
                post.id,
                post.authorEmail,
                post.authorName,
                post.title,
                post.text,
                post.mood,
                post.contentType,
                post.public,
                post.createdAt,
                post.imageUrl,
                post.videoUrl
            ];
            
            const result = await supabasePool.query(supabaseQuery, supabaseParams);
            console.log(`✅ Post ${post.id} successfully synced to Supabase`);
            
            // Remove from pending_posts on success
            await database.removePendingPost(post.id);
            
            // Log success
            await this.logSyncActivity(post.id, 'success', null, retryCount + 1);
            
            return { success: true };
            
        } catch (error) {
            console.error(`❌ Failed to retry post ${post.id}:`, error.message);
            
            // Update retry count and error
            const nextRetryAt = Date.now() + this.calculateBackoff(retryCount + 1);
            await database.updatePendingPostRetry(post.id, retryCount + 1, nextRetryAt, error.message);
            
            // Log failure
            await this.logSyncActivity(post.id, 'error', error.message, retryCount + 1);
            
            return { success: false, error: error.message };
        }
    }

    async logSyncActivity(postId, status, error, retryAttempt) {
        // This would log to an activity table if available
        console.log(`📊 Sync Activity: Post ${postId} - ${status}${error ? ` - ${error}` : ''} (Attempt ${retryAttempt})`);
    }

    async processPendingPosts() {
        try {
            const pendingPosts = await database.getPendingPosts();
            
            if (pendingPosts.length === 0) {
                console.log('📭 No pending posts to process');
                return;
            }
            
            console.log(`🔄 Processing ${pendingPosts.length} pending posts`);
            
            for (const post of pendingPosts) {
                // Check if it's time to retry
                const now = Date.now();
                const shouldRetry = !post.lastRetryAt || post.lastRetryAt <= now;
                
                if (shouldRetry) {
                    await this.retryPendingPost(post);
                } else {
                    console.log(`⏰ Post ${post.id} not ready for retry yet`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error processing pending posts:', error);
        }
    }

    start() {
        if (this.isRunning) {
            console.log('⚠️ Sync worker is already running');
            return;
        }
        
        this.isRunning = true;
        console.log('🚀 Starting DreamPost sync worker');
        
        // Process immediately on start
        this.processPendingPosts();
        
        // Set up recurring check every minute
        this.retryInterval = setInterval(() => {
            this.processPendingPosts();
        }, 60000); // 1 minute
        
        console.log('⏰ Sync worker started - checking pending posts every minute');
    }

    stop() {
        if (this.retryInterval) {
            clearInterval(this.retryInterval);
            this.retryInterval = null;
        }
        
        this.isRunning = false;
        console.log('🛑 DreamPost sync worker stopped');
    }
}

// Start the worker if this file is run directly
if (require.main === module) {
    const worker = new SyncWorker();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('🛑 Received SIGINT, shutting down gracefully...');
        worker.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('🛑 Received SIGTERM, shutting down gracefully...');
        worker.stop();
        process.exit(0);
    });
    
    worker.start();
}

module.exports = SyncWorker;
