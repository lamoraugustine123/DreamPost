/**
 * Dual-database helpers for writing to both SQLite and Supabase PostgreSQL.
 *
 * Each helper is a factory that receives the database and pool instances
 * so the module stays decoupled from any single server file.
 */

function createWriteToBoth(database, supabasePool) {
    return async function writeToBoth(sqliteQuery, supabaseQuery, sqliteParams = [], supabaseParams = [], postData = null) {
        const results = [];

        try {
            const sqliteResult = await database.run(sqliteQuery, sqliteParams);
            results.push({ database: 'sqlite', success: true, data: sqliteResult });
        } catch (error) {
            console.error('SQLite write error:', error);
            results.push({ database: 'sqlite', success: false, error: error.message });
        }

        try {
            const supabaseResult = await supabasePool.query(supabaseQuery, supabaseParams);
            results.push({ database: 'supabase', success: true, data: supabaseResult.rows[0] });
        } catch (error) {
            console.error('Supabase write error:', error);
            results.push({ database: 'supabase', success: false, error: error.message });

            if (postData && database.addPendingPost) {
                try {
                    await database.addPendingPost({
                        ...postData,
                        error: error.message,
                        lastRetryAt: Date.now()
                    });
                    console.log('Post saved to pending_posts for retry:', postData.id);
                } catch (pendingError) {
                    console.error('Failed to save to pending_posts:', pendingError);
                }
            }
        }

        return results;
    };
}

function createReadFromSupabase(supabasePool) {
    return async function readFromSupabase(query, params = []) {
        try {
            const result = await supabasePool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Supabase read error, falling back to SQLite:', error);
            return new Promise((resolve, reject) => {
                const sqlite3 = require('sqlite3').verbose();
                const path = require('path');
                const dbPath = path.join(__dirname, '..', 'dreams.db');
                const db = new sqlite3.Database(dbPath);

                const sqliteQuery = query.replace(/\$\d+/g, '?');

                if (sqliteQuery.toLowerCase().includes('select count(*)')) {
                    db.get(sqliteQuery, params, (err, row) => {
                        db.close();
                        if (err) {
                            console.error('SQLite fallback error:', err);
                            resolve([{}]);
                        } else {
                            resolve([row || { count: 0 }]);
                        }
                    });
                } else {
                    db.all(sqliteQuery, params, (err, rows) => {
                        db.close();
                        if (err) {
                            console.error('SQLite fallback error:', err);
                            resolve([]);
                        } else {
                            resolve(rows || []);
                        }
                    });
                }
            });
        }
    };
}

function createLogActivity(writeToBothFn) {
    return async function logActivity(userId, userEmail, action, details = null, ipAddress = null, userAgent = null) {
        const query = 'INSERT INTO activities (user_id, user_email, action, details, ip_address, user_agent, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))';
        const params = [userId, userEmail, action, details, ipAddress, userAgent];
        return await writeToBothFn(query, query, params, params);
    };
}

module.exports = {
    createWriteToBoth,
    createReadFromSupabase,
    createLogActivity,
};
