const path = require('path');

// Use the Database class (not the singleton) so each test suite gets a fresh in-memory DB
const { Database } = require('../database');

let db;

beforeAll((done) => {
    db = new Database(':memory:');
    // The constructor calls init() which runs serialize() — give it time to finish
    setTimeout(done, 500);
});

afterAll(() => {
    db.close();
});

// ── User CRUD ──────────────────────────────────────────────────────────

describe('User operations', () => {
    const testUser = {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        password: 'hashedpw',
        salt: 'somesalt',
        joinedAt: Date.now(),
    };

    test('createUser stores a new user and returns it', async () => {
        const result = await db.createUser(testUser);
        expect(result).toMatchObject({
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
        });
    });

    test('getUserByEmail retrieves the created user', async () => {
        const user = await db.getUserByEmail('alice@example.com');
        expect(user).toBeTruthy();
        expect(user.name).toBe('Alice');
        expect(user.email).toBe('alice@example.com');
    });

    test('getUserByEmail returns undefined for unknown email', async () => {
        const user = await db.getUserByEmail('nobody@example.com');
        expect(user).toBeUndefined();
    });

    test('createUser rejects duplicate email', async () => {
        await expect(db.createUser({ ...testUser, id: 'user-dup' })).rejects.toThrow();
    });

    test('updateUserProfile updates selected fields', async () => {
        const res = await db.updateUserProfile('alice@example.com', {
            bio: 'Hello world',
            location: 'Accra',
        });
        expect(res.changes).toBe(1);

        const user = await db.getUserByEmail('alice@example.com');
        expect(user.bio).toBe('Hello world');
        expect(user.location).toBe('Accra');
    });

    test('updateUserProfile returns null if no fields provided', async () => {
        const res = await db.updateUserProfile('alice@example.com', {});
        expect(res).toBeNull();
    });
});

// ── Post CRUD ──────────────────────────────────────────────────────────

describe('Post operations', () => {
    // Insert a post directly via SQL because createPost references a column
    // named "image" that doesn't exist in the schema (pre-existing bug).
    beforeAll(async () => {
        await db.run(
            `INSERT INTO posts (id, authorEmail, authorName, title, text, mood, contentType, public, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['post-1', 'alice@example.com', 'Alice', 'My Dream', 'I dreamt of flying.', 'happy', 'dream', 1, Date.now()]
        );
    });

    test('getAllPosts returns the public post', async () => {
        const posts = await db.getAllPosts();
        expect(posts.length).toBeGreaterThanOrEqual(1);
        const found = posts.find(p => p.id === 'post-1');
        expect(found).toBeTruthy();
        expect(found.public).toBe(true);
        expect(Array.isArray(found.likedBy)).toBe(true);
    });

    test('getPostById returns the post with comments array', async () => {
        const post = await db.getPostById('post-1');
        expect(post).toBeTruthy();
        expect(post.title).toBe('My Dream');
        expect(Array.isArray(post.comments)).toBe(true);
    });

    test('getPostById returns null for unknown id', async () => {
        const post = await db.getPostById('nonexistent');
        expect(post).toBeNull();
    });

    test('updatePostLikes updates like count and likedBy', async () => {
        await db.updatePostLikes('post-1', 2, ['a@b.com', 'c@d.com']);
        const post = await db.getPostById('post-1');
        expect(post.likes).toBe(2);
        expect(post.likedBy).toEqual(['a@b.com', 'c@d.com']);
    });

    test('getAllPostsWithComments returns posts with commentCount', async () => {
        const posts = await db.getAllPostsWithComments();
        expect(posts.length).toBeGreaterThanOrEqual(1);
        expect(posts[0]).toHaveProperty('commentCount');
    });
});

// ── Comment operations ─────────────────────────────────────────────────

describe('Comment operations', () => {
    test('addComment creates a comment on a post', async () => {
        const comment = await db.addComment({
            id: 'comment-1',
            postId: 'post-1',
            authorEmail: 'alice@example.com',
            authorName: 'Alice',
            text: 'Great dream!',
            createdAt: Date.now(),
        });
        expect(comment.id).toBe('comment-1');
        expect(comment.parentId).toBeNull();
    });

    test('addComment creates a reply (nested comment)', async () => {
        const reply = await db.addComment({
            id: 'comment-2',
            postId: 'post-1',
            authorEmail: 'alice@example.com',
            authorName: 'Alice',
            text: 'Replying to myself',
            createdAt: Date.now(),
            parentId: 'comment-1',
        });
        expect(reply.parentId).toBe('comment-1');
    });

    test('getCommentsByPostId returns all comments for the post', async () => {
        const comments = await db.getCommentsByPostId('post-1');
        expect(comments.length).toBe(2);
    });

    test('getPostById organises replies under parent comments', async () => {
        const post = await db.getPostById('post-1');
        const parent = post.comments.find(c => c.id === 'comment-1');
        expect(parent).toBeTruthy();
        expect(parent.replies.length).toBe(1);
        expect(parent.replies[0].id).toBe('comment-2');
    });
});

// ── Bookmark operations ────────────────────────────────────────────────

describe('Bookmark operations', () => {
    test('addBookmark bookmarks a post', async () => {
        const bm = await db.addBookmark('alice@example.com', 'post-1');
        expect(bm.userEmail).toBe('alice@example.com');
        expect(bm.postId).toBe('post-1');
    });

    test('removeBookmark removes the bookmark', async () => {
        const res = await db.removeBookmark('alice@example.com', 'post-1');
        expect(res.changes).toBe(1);
    });

    // NOTE: getUserBookmarks is not tested here because the production code
    // has a pre-existing syntax bug (missing comma) that causes a crash.
});

// ── Follow system ──────────────────────────────────────────────────────

describe('Follow operations', () => {
    beforeAll(async () => {
        await db.createUser({
            id: 'user-2',
            name: 'Bob',
            email: 'bob@example.com',
            password: 'hash',
            salt: 'salt',
            joinedAt: Date.now(),
        });
    });

    test('addFollow creates a follow relationship', async () => {
        const result = await db.addFollow('alice@example.com', 'bob@example.com');
        expect(result).toHaveProperty('id');
    });

    test('checkFollowStatus returns true when following', async () => {
        const status = await db.checkFollowStatus('alice@example.com', 'bob@example.com');
        expect(status).toBe(true);
    });

    test('checkFollowStatus returns false when not following', async () => {
        const status = await db.checkFollowStatus('bob@example.com', 'alice@example.com');
        expect(status).toBe(false);
    });

    test('getFollowerCount returns 1 for bob', async () => {
        const count = await db.getFollowerCount('bob@example.com');
        expect(count).toBe(1);
    });

    test('getFollowingCount returns 1 for alice', async () => {
        const count = await db.getFollowingCount('alice@example.com');
        expect(count).toBe(1);
    });

    test('getFollowersList returns alice as follower of bob', async () => {
        const followers = await db.getFollowersList('bob@example.com');
        expect(followers.length).toBe(1);
        expect(followers[0].followerEmail).toBe('alice@example.com');
    });

    test('getFollowingList returns bob as following of alice', async () => {
        const following = await db.getFollowingList('alice@example.com');
        expect(following.length).toBe(1);
        expect(following[0].followingEmail).toBe('bob@example.com');
    });

    test('removeFollow removes the relationship', async () => {
        const res = await db.removeFollow('alice@example.com', 'bob@example.com');
        expect(res.deleted).toBe(1);

        const status = await db.checkFollowStatus('alice@example.com', 'bob@example.com');
        expect(status).toBe(false);
    });
});

// ── Generic run method ─────────────────────────────────────────────────

describe('run (generic query)', () => {
    test('executes arbitrary SQL and returns lastID/changes', async () => {
        const res = await db.run(
            "INSERT INTO users (id, name, email, password, salt, joinedAt) VALUES (?, ?, ?, ?, ?, ?)",
            ['user-run', 'RunTest', 'run@example.com', 'pw', 's', Date.now()]
        );
        expect(res).toHaveProperty('changes');
        expect(res.changes).toBe(1);
    });
});
