-- Database initialization for Fav Web

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    employee_id TEXT,
    photo_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_time TEXT DEFAULT CURRENT_TIMESTAMP,
    image_path TEXT,
    result TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
