-- DreamPost Database Schema
-- SQLite database for storing users and posts

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    salt TEXT NOT NULL,
    joinedAt INTEGER NOT NULL,
    badgeShareCount INTEGER DEFAULT 0,
    bio TEXT,
    profileImage TEXT,
    coverImage TEXT,
    website TEXT,
    location TEXT
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    mood TEXT NOT NULL,
    image TEXT,
    public INTEGER DEFAULT 1,
    authorEmail TEXT NOT NULL,
    authorName TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (authorEmail) REFERENCES users(email)
);

-- Likes table (for tracking who liked what)
CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    postId TEXT NOT NULL,
    userEmail TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (postId) REFERENCES posts(id),
    FOREIGN KEY (userEmail) REFERENCES users(email),
    UNIQUE(postId, userEmail)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    postId TEXT NOT NULL,
    userName TEXT NOT NULL,
    text TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (postId) REFERENCES posts(id)
);

-- Insert sample data
INSERT OR IGNORE INTO users VALUES 
('1777344347860', 'test user1', 'lamoraugustine122@gmail.com', '7bc4186743f28bf4c10d3d386348f84e657ef9ca40df93e98135a8280f0b20a2', '75ea053863c959a179a5f44558ac98fd', 1777344347860, 0, NULL, NULL, NULL, NULL, NULL),
('1777352453301', 'test user2', 'lamarkchristopher770@gmail.com', 'd7835b4864ac6852db6ee80e7e25f793aa4a891cbe2cb0305f656d2fcf0eb58c', '1675afe84f9f7b044000c10e95cc3fed', 1777352453301, 0, NULL, NULL, NULL, NULL, NULL);

INSERT OR IGNORE INTO posts VALUES 
('1777352545080', 'a runner', 'i wish to be a runner', 'Joyful', NULL, 1, 'lamarkchristopher770@gmail.com', 'test user2', 2, 1777352545080),
('1777353001323', 'THE BEINING OF THE END', 'A man wishes for the people to repent so that  they can go to heaven', 'Determined', NULL, 1, 'lamoraugustine122@gmail.com', 'test user1', 2, 1777353001323);

INSERT OR IGNORE INTO likes VALUES 
('like1', '1777352545080', 'lamarkchristopher770@gmail.com', 1777352545080),
('like2', '1777352545080', 'lamoraugustine122@gmail.com', 1777352545080),
('like3', '1777353001323', 'lamarkchristopher770@gmail.com', 1777353001323),
('like4', '1777353001323', 'lamoraugustine122@gmail.com', 1777353001323);

INSERT OR IGNORE INTO comments VALUES 
('782205aa-5d55-410a-a012-a62df56e0b64', '1777352545080', 'test user1', 'it shall come to past amen\nalso try to join the marathon', 1777408168285),
('e561e01f-fa24-4148-8713-5bfc61165875', '1777352545080', 'test user1', 'in God we trust', 1777408191493),
('b5dba241-cd25-4163-acc4-20b34f3ab9e0', '1777352545080', 'test user1', 'work hard kid \ud83d\ude0a\ud83d\ude18', 1777408222783);
