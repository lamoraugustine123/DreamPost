# DreamPost Dual Database Backend

## Overview

This backend integrates both SQLite3 and Supabase PostgreSQL to provide a robust development and production solution for the DreamPost platform.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend    │    │   Backend       │
│   (app.js)   │───▶│   (server.js)   │
└─────────────────┘    └─────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐    ┌─────────────────┐
│   SQLite3     │    │   Supabase      │
│  (Local Dev)  │    │  (Cloud Prod)  │
│               │    │                 │
└─────────────────┘    └─────────────────┘
```

## Database Strategy

### SQLite3 (Local Development)
- **Purpose**: Fast local development and prototyping
- **Use Case**: Quick testing, offline development
- **Advantages**: No network latency, instant setup
- **Data Persistence**: Local file (`dreampost.db`)

### Supabase PostgreSQL (Cloud Production)
- **Purpose**: Production analytics and cloud storage
- **Use Case**: Real-time analytics, scalable storage
- **Advantages**: Advanced queries, real-time sync, backup
- **Features**: Row Level Security, advanced analytics

## Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create `.env` file:
```env
SUPABASE_URL=https://upkwtzufdedsfjklzmdq.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
SUPABASE_SECRET_KEY=your-secret-key-here
```

### 3. Setup Supabase Database
```bash
npm run setup:supabase
```

### 4. Run Server

**Development Mode (SQLite3)**:
```bash
npm start
```

**Dual Database Mode**:
```bash
npm run start:dual
```

## API Endpoints

### Authentication
- `POST /api/login` - User login (Supabase)
- `POST /api/signup` - User registration (Both databases)

### Posts
- `POST /api/posts` - Create post (Both databases)
- `GET /api/posts` - Get posts (SQLite3 for speed)

### Admin Dashboard
- `GET /api/admin/overview` - Analytics overview (Supabase)
- `GET /api/admin/clients` - User management (Supabase)
- `GET /api/admin/activities` - Activity logs (Supabase)
- `GET /api/admin/health` - System health (Both)

## Database Operations

### Dual Write Pattern
```javascript
// Write to both databases
const results = await dbManager.writeToBoth(
    'INSERT INTO posts (id, user_id, title, content, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',  // SQLite
    'INSERT INTO posts (id, user_id, title, content, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',  // PostgreSQL
    [postId, userId, title, content],  // Parameters
    [postId, userId, title, content]   // PostgreSQL parameters
);
```

### Analytics Queries (Supabase)
```javascript
const analytics = await dbManager.getAnalyticsData();
// Returns:
// - totalUsers, activeUsers, totalPosts, newSignups
// - userGrowth (30 days), postActivity (30 days)
```

### Activity Logging
```javascript
// Automatic logging for all user actions
await dbManager.logActivity(userId, userEmail, 'login', details, ipAddress, userAgent);
```

## Features

### ✅ Implemented
- [x] Dual database architecture
- [x] Supabase PostgreSQL integration
- [x] SQLite3 local development
- [x] Role-based access control
- [x] Real-time analytics
- [x] Activity logging
- [x] Error handling and fallback
- [x] Admin dashboard integration

### 🔄 In Progress
- [ ] Supabase Auth integration
- [ ] Real-time synchronization
- [ ] Advanced analytics caching
- [ ] Database migration tools

## Security

### Authentication
- Password hashing with salt
- JWT tokens (planned)
- Role-based permissions
- Row Level Security (Supabase)

### Data Protection
- Input sanitization
- SQL injection prevention
- Rate limiting
- CORS configuration

## Performance

### Optimization Strategies
1. **Read Operations**: SQLite3 for local speed
2. **Analytics**: PostgreSQL for complex queries
3. **Caching**: Analytics cache table
4. **Connection Pooling**: PostgreSQL connection pool
5. **Error Handling**: Graceful degradation

### Monitoring
- Health check endpoint
- Database connection monitoring
- Error logging
- Activity tracking

## Deployment

### Development
```bash
# Start with SQLite3 only
npm start

# Start with dual databases
npm run start:dual
```

### Production
1. Set up Supabase project
2. Configure environment variables
3. Run database migrations
4. Deploy with dual database mode
5. Monitor health endpoints

## Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check Supabase credentials
node setup-supabase.js --help

# Verify connection
curl -H "apikey: YOUR_KEY" https://upkwtzufdedsfjklzmdq.supabase.co/rest/v1/users
```

**Sync Issues**
- Check network connectivity
- Verify Supabase service status
- Review error logs
- Test individual database operations

**Performance Issues**
- Use SQLite3 for local reads
- Optimize PostgreSQL queries
- Check analytics cache
- Monitor connection pool

## Configuration

### Environment Variables
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_SECRET_KEY=your-secret-key

# Server Configuration
PORT=3005
NODE_ENV=development
```

### Database Configuration
```javascript
// SQLite3 Configuration
const sqliteDb = new sqlite3.Database('./dreampost.db');

// Supabase Configuration
const supabasePool = new Pool({
    connectionString: 'postgresql://user:pass@host:5432/dbname',
    ssl: { rejectUnauthorized: false }
});
```

## Development Workflow

1. **Local Development**: Use SQLite3 for speed
2. **Testing**: Test both databases
3. **Analytics**: Use Supabase for insights
4. **Production**: Deploy with dual mode
5. **Monitoring**: Watch health endpoints

## Future Enhancements

### Phase 2 Features
- [ ] Supabase Auth integration
- [ ] Real-time subscriptions
- [ ] Advanced analytics dashboard
- [ ] Database backup automation
- [ ] Multi-region deployment

### Phase 3 Features
- [ ] Microservices architecture
- [ ] GraphQL API
- [ ] Advanced caching layer
- [ ] Machine learning analytics
- [ ] Mobile API optimization

## Support

### Documentation
- API docs: `/api/docs`
- Admin dashboard: `/admin-dashboard.html`
- Health check: `/api/admin/health`

### Monitoring
- Logs: Console and database logs
- Metrics: Analytics dashboard
- Alerts: Error notifications

---

**DreamPost Dual Database Backend v1.0.0**  
*SQLite3 + Supabase PostgreSQL Integration*
