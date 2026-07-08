-- Database initialization for Fav Web
-- NOTE: This file is kept as a reference only. The actual schema is created
-- by SQLAlchemy's Base.metadata.create_all in backend/services/db_models.py
-- at startup. Admin seeding happens in init_db() (db_models.py) — see the
-- 'Seed default admin' block there.

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    department TEXT,
    registered_images INTEGER DEFAULT 0,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    captured_image_url TEXT
);