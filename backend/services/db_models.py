from datetime import datetime
from pathlib import Path
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Index, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / '.env')

DB_PATH = BASE_DIR / 'database' / 'app.db'
STATIC_LOG_DIR = BASE_DIR / 'static' / 'logs'
DATA_RAW_DIR = BASE_DIR / 'backend' / 'ai_core' / 'data' / 'raw'

STATIC_LOG_DIR.mkdir(parents=True, exist_ok=True)
DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{DB_PATH}')

if DATABASE_URL.startswith('sqlite'):
    engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False})
else:
    # RDS (PostgreSQL/MySQL) does not use check_same_thread
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    registered_images = Column(Integer, default=0)
    role = Column(String(50), default='user')
    created_at = Column(DateTime, default=datetime.utcnow)

class Log(Base):
    __tablename__ = 'logs'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    captured_image_url = Column(String(1024), nullable=True)


class Game(Base):
    __tablename__ = 'games'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(String(1024), nullable=True)
    content = Column(String(5000), nullable=True)
    image_url = Column(String(255), nullable=True)
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Music(Base):
    __tablename__ = 'music'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    artist = Column(String(255), nullable=False)
    duration = Column(String(10), nullable=False)
    genre = Column(String(100), nullable=False)
    file_url = Column(String(512), nullable=True)
    playlist_id = Column(Integer, nullable=True)
    plays = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Playlist(Base):
    __tablename__ = 'playlists'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(1024), nullable=True)
    song_count = Column(Integer, default=0)
    image_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Knowledge(Base):
    __tablename__ = 'knowledge'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(String(1024), nullable=False)
    content = Column(String(5000), nullable=True)
    author = Column(String(255), nullable=False)
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Post(Base):
    __tablename__ = 'posts'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False)
    post_type = Column(String(50), nullable=False)      # 'image', 'video', 'audio', 'game', 'text'
    title = Column(String(255), nullable=False)
    description = Column(String(5000), nullable=True)
    media_url = Column(String(1024), nullable=True)
    thumbnail = Column(String(1024), nullable=True)
    status = Column(String(50), default='public')       # 'public', 'friends', 'private'
    created_at = Column(DateTime, default=datetime.utcnow)


class UserActivity(Base):
    """Per-user content event log for Personal Dashboard insights.

    Parallel to the global counters on the content tables (Game.views,
    Music.plays, Knowledge.likes) — those track site-wide totals. This
    table tracks per-user totals so we can answer "BẠN đã đọc bài X
    tuần này" instead of "tất cả mọi người đã đọc bài X tuần này".

    Idempotency (the dashboard_service layer dedupes within 1 minute
    on the same user+content+event triple) is the only thing standing
    between a spam-click user and a 1000-row table.
    """
    __tablename__ = 'user_activity'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    content_type = Column(String(20), nullable=False)   # 'knowledge' | 'music' | 'game' | 'post'
    content_id = Column(Integer, nullable=False)
    event_type = Column(String(20), nullable=False)     # 'view' | 'play' | 'like'
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Composite index for the dashboard's hot path:
    # "count events for user X in the last N days, grouped by content_type".
    # Without this, the per-day query scans the whole user_activity table.
    __table_args__ = (
        Index('ix_user_activity_user_ctype_etime_ctime',
              'user_id', 'content_type', 'event_type', 'created_at'),
    )


def init_db():
    Base.metadata.create_all(bind=engine)

    # Seed default admin if no admin user exists. Idempotent: safe to run
    # on every startup. Password hash is generated once and pinned here so
    # the dev doesn't need to read a random password from logs.
    db = SessionLocal()
    try:
        has_admin = db.query(User).filter(User.role == 'admin').first()
        if not has_admin:
            # Lazy import to avoid circular dependency at module load time.
            from services.db_service import hash_password
            admin = User(
                user_id='admin',
                name='Admin',
                email='admin@example.com',
                department='IT',
                password_hash=hash_password('123456'),
                role='admin',
                registered_images=0,
            )
            db.add(admin)
            db.commit()
            print('[init_db] Seeded default admin user (user_id=admin, password=123456)')
    finally:
        db.close()

