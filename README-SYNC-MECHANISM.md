# DreamPost Sync Mechanism

## Overview
This document describes the background retry mechanism that ensures posts are always synced to Supabase PostgreSQL, even when the connection is temporarily unavailable.

## Features

### 🔄 Automatic Retry System
- **Offline Support**: Posts are saved locally when Supabase is unavailable
- **Exponential Backoff**: Smart retry delays (1s → 5s → 30s → 5min)
- **Background Processing**: Continuous monitoring and retry attempts
- **Error Logging**: Comprehensive logging of all sync activities

### 📊 Database Tables

#### `pending_posts`
Stores posts that failed to sync to Supabase for retry:

```sql
CREATE TABLE IF NOT EXISTS pending_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    mood TEXT,
    contentType TEXT DEFAULT 'dream',
    public INTEGER DEFAULT 1,
    authorEmail TEXT,
    authorName TEXT NOT NULL,
    imageUrl TEXT,
    videoUrl TEXT,
    createdAt INTEGER NOT NULL,
    retryCount INTEGER DEFAULT 0,
    lastRetryAt INTEGER,
    error TEXT
);
```

## 🚀 Usage

### Starting the System
```bash
# Start both server and sync worker
npm run start:sync

# Start only the sync worker
npm run worker
```

### 🔄 Retry Logic
1. **Initial Failure**: Post saved to `pending_posts` with error details
2. **Backoff Calculation**: 
   - Attempt 1: 1 second delay
   - Attempt 2: 5 second delay
   - Attempt 3: 30 second delay
   - Attempt 4+: 5 minute delay
3. **Retry Process**:
   - Wait calculated backoff time
   - Attempt to write to Supabase
   - On success: Remove from `pending_posts`
   - On failure: Update retry count and schedule next attempt

### 📝 Monitoring
The system provides detailed logging for:
- ✅ Successful sync operations
- ❌ Failed retry attempts with error details
- 🔄 Retry scheduling and timing
- 📊 Pending posts count and status

### 🛡️ Error Handling
- Network timeouts are automatically retried
- Database connection errors are logged and retried
- Permanent failures are preserved for manual review
- All errors include timestamps and retry counts

### 🔧 Configuration
- **Check Interval**: Every 60 seconds
- **Max Retries**: Unlimited (with increasing delays)
- **Graceful Shutdown**: SIGINT/SIGTERM handling

## 📁 Files
- `sync-worker.js` - Background retry mechanism
- `start-server.js` - Starts both server and worker
- `database.js` - Updated with pending_posts methods
- `server.js` - Modified to save failed posts to pending_posts

## 🎯 Benefits
- **Reliability**: Posts are never lost due to temporary outages
- **Performance**: Intelligent retry timing prevents system overload
- **Monitoring**: Full visibility into sync status and health
- **Recovery**: Automatic recovery when connectivity is restored
