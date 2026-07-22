from datetime import datetime
from pathlib import Path
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Index, UniqueConstraint, create_engine
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
    # The User.user_id of whoever owns this article — used so the
    # comment service can notify them when someone else comments.
    # Nullable: legacy rows from before this column existed never had
    # an owner, and we don't have a reliable way to retroactively
    # match them to a User. New rows should always set this via the
    # /knowledge POST endpoint.
    author_user_id = Column(String(50), nullable=True, index=True)
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Tier 3 M: draft + scheduled-publish state. `status` is
    # 'published' | 'draft' | 'scheduled'. `scheduled_at` only set
    # when status='scheduled'. `published_at` is the moment the
    # article went live — set on create for 'published' rows, set
    # later by the publisher loop for 'scheduled' rows.
    status = Column(String(20), default='published', index=True)
    scheduled_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)


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


class Comment(Base):
    """Threaded comment on knowledge articles or feed posts.

    Threading is one level deep: a top-level comment has parent_id=None;
    a reply points at the comment it replies to. We don't model deeper
    trees because the FE only renders one indent — anything deeper would
    be visual noise in the article/post modal.

    `updated_at` is set only when the body is edited (PATCH /comments/
    {id}). The FE uses it to show a "đã chỉnh sửa" hint next to the
    timestamp when it's non-null. Nullable so old rows stay NULL =
    "never edited".

    Indexes are split: (content_type, content_id) for the list endpoint
    "give me all comments for this article", and (parent_id) for the
    reply fan-out when we assemble the tree.
    """
    __tablename__ = 'comments'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    content_type = Column(String(20), nullable=False)   # 'knowledge' | 'post'
    content_id = Column(Integer, nullable=False)
    parent_id = Column(Integer, nullable=True, index=True)
    body = Column(String(2000), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index('ix_comments_content', 'content_type', 'content_id', 'created_at'),
    )


class Reaction(Base):
    """One row per user reaction on a knowledge article or post.

    A user may have at most one reaction on a given (content_type,
    content_id) tuple — enforced by the unique constraint. To change
    emoji the service deletes the old row and inserts a new one; to
    toggle off (same emoji clicked again) the service deletes the row.

    Keeping reactions in a separate table (vs. a counter column on
    Knowledge/Post) lets us answer "did the current user already
    react?" with a single SELECT, which is the FE's hot path for
    rendering the emoji bar with the right highlight state.
    """
    __tablename__ = 'reactions'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False)
    content_type = Column(String(20), nullable=False)   # 'knowledge' | 'post'
    content_id = Column(Integer, nullable=False)
    emoji = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('user_id', 'content_type', 'content_id',
                         name='uq_reaction_user_content'),
        Index('ix_reactions_content', 'content_type', 'content_id'),
    )


class Notification(Base):
    """Per-user inbox row for the notification bell.

    The `recipient_id` is the user who receives the notification;
    `actor_*` is who triggered it (None for system-generated entries
    such as future admin announcements). `actor_name` is denormalized
    at insert time so listing notifications doesn't need to JOIN
    users on every read — saves a query and a small RTT.

    Spam control is layered:
      1. Triggers only call create_notification on comment events
         (replies and top-level comments on a recipient's post).
      2. create_notification dedupes within the last 60s for the
         same (recipient, actor, type, content_type, content_id) so
         a click-storm doesn't flood the inbox.
    """
    __tablename__ = 'notifications'

    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(String(50), nullable=False, index=True)
    actor_id = Column(String(50), nullable=True)
    actor_name = Column(String(255), nullable=True)
    type = Column(String(30), nullable=False)            # 'comment_reply' | 'comment_on_post'
    content_type = Column(String(20), nullable=True)     # 'knowledge' | 'post'
    content_id = Column(Integer, nullable=True)
    message = Column(String(500), nullable=False)
    read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Hot path for the bell badge: "unread count for user X".
    # Covers WHERE recipient_id = ? AND read = false.
    __table_args__ = (
        Index('ix_notifications_recipient_unread',
              'recipient_id', 'read', 'created_at'),
    )


class Follow(Base):
    """Directed follow edge between two users.

    `follower_id` is the user who clicked "follow"; `target_id` is
    the user being followed. Uniqueness on (follower_id, target_id)
    means a user can follow another user at most once — same toggle
    pattern as bookmarks: try INSERT, catch IntegrityError → DELETE.

    We model follows as directed (not symmetric friendship) because
    Tier 3 N's "friends activity feed" wants the explicit list of
    people I chose to follow, not the union of who follows me.

    Self-follow is rejected at the service layer (you can't follow
    yourself) — there's no DB constraint because SQLite's CHECK
    support is fiddly and the service is the only caller.

    The composite index covers the two hot paths:
      - "am I following user X?" — (follower_id, target_id) lookup.
      - "who does user X follow?" — (follower_id, created_at) range.
    """
    __tablename__ = 'follows'

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(String(50), nullable=False)
    target_id = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        UniqueConstraint('follower_id', 'target_id', name='uq_follow_pair'),
        Index('ix_follows_follower_ctime', 'follower_id', 'created_at'),
        Index('ix_follows_target_ctime', 'target_id', 'created_at'),
    )


class Tag(Base):
    """Flat tag vocabulary shared across content types.

    Tags are global (no per-user / per-content owner). `name` is
    unique — the service layer normalizes case + whitespace before
    insert so "Machine Learning" and "machine learning" collide.

    We don't store a usage count here — keeping the row tight and
    letting COUNT(*) queries cover the autocomplete hot path. The
    DB is small enough that a single GROUP BY over content_tags is
    fine for ranking suggestions.
    """
    __tablename__ = 'tags'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ContentTag(Base):
    """Polymorphic M2M between a Tag and a piece of content
    (knowledge article or feed post in MVP). Uniqueness on
    (tag_id, content_type, content_id) gives us the toggle primitive
    used by the attach endpoint.

    Index on (content_type, content_id) lets us answer "what tags
    does this article have?" without a scan; index on tag_id is the
    inverse query "what content uses this tag?" used by the filter
    endpoint.
    """
    __tablename__ = 'content_tags'

    id = Column(Integer, primary_key=True, index=True)
    tag_id = Column(Integer, nullable=False, index=True)
    content_type = Column(String(20), nullable=False)   # 'knowledge' | 'post' (MVP)
    content_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('tag_id', 'content_type', 'content_id',
                         name='uq_content_tag_unique'),
        Index('ix_content_tags_content', 'content_type', 'content_id'),
    )


class Collection(Base):
    """User-curated grouping of knowledge articles.

    Collections are private — there's no `is_public` flag because the
    current UX is "my reading list", not "shared with the org". If
    sharing gets added later, the public/private distinction should
    become a single Boolean column here rather than a new table.
    """
    __tablename__ = 'collections'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(1024), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class CollectionItem(Base):
    """Article in a collection. Polymorphic on (content_type,
    content_id) so we could add posts / games / music to collections
    later without a schema change — but the MVP only adds Knowledge
    items (matches the plan's "reading list" framing).

    Uniqueness on (collection_id, content_type, content_id) lets the
    service use the same toggle primitive as bookmarks: try INSERT,
    catch IntegrityError → DELETE."""
    __tablename__ = 'collection_items'

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, nullable=False, index=True)
    content_type = Column(String(20), nullable=False)   # 'knowledge' (MVP)
    content_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('collection_id', 'content_type', 'content_id',
                         name='uq_collection_item_unique'),
    )


class Bookmark(Base):
    """Per-user save on a content item. One row per (user, content_type,
    content_id) — enforced by the unique constraint. Toggle semantics are
    handled in the service: add if missing, delete if present, then return
    the new state.

    Bookmarks are intentionally separate from reactions/comments —
    bookmarking is a private personal list, not public signal. We don't
    bump any global counter on the target row because the count of
    saves is private to the saver.
    """
    __tablename__ = 'bookmarks'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False)
    content_type = Column(String(20), nullable=False)   # 'knowledge' | 'post' (MVP)
    content_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # A user can only have one bookmark per (content_type, content_id).
    # The unique constraint gives us the toggle primitive: try INSERT,
    # catch IntegrityError → delete the existing row.
    __table_args__ = (
        UniqueConstraint('user_id', 'content_type', 'content_id',
                         name='uq_bookmark_user_content'),
        # Hot path: "is this content bookmarked by user X?" — used by
        # the FE to render the correct filled/unfilled 🔖 state.
        Index('ix_bookmarks_user_ctype_cid', 'user_id', 'content_type', 'content_id'),
    )


def init_db():
    Base.metadata.create_all(bind=engine)

    # SQLite-only micro-migrations for columns added after the table
    # already exists. create_all() above only creates *missing* tables;
    # it never ALTERs. We use the inspector to detect what's already
    # there and add new columns idempotently. New columns must be
    # nullable (existing rows need a default), and we don't backfill —
    # any backfill is the caller's responsibility in their service.
    if DATABASE_URL.startswith('sqlite'):
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        with engine.begin() as conn:
            knowledge_cols = {c['name'] for c in inspector.get_columns('knowledge')} if inspector.has_table('knowledge') else set()
            if 'author_user_id' not in knowledge_cols:
                conn.execute(text('ALTER TABLE knowledge ADD COLUMN author_user_id VARCHAR(50)'))
                conn.execute(text('CREATE INDEX IF NOT EXISTS ix_knowledge_author_user_id ON knowledge (author_user_id)'))
            # Tier 3 M: draft + scheduled publish state. `published_at`
            # records when the article went live (whether immediately
            # on create or later when the scheduled background loop
            # promoted it). `scheduled_at` is the publish trigger
            # time, set only when status='scheduled'.
            if 'status' not in knowledge_cols:
                conn.execute(text("ALTER TABLE knowledge ADD COLUMN status VARCHAR(20) DEFAULT 'published'"))
                # Backfill: rows that pre-date this column must look
                # 'published' so the list endpoint keeps returning
                # them. We backfill published_at = created_at so the
                # publishing timeline reads sensibly.
                conn.execute(text("UPDATE knowledge SET status = 'published' WHERE status IS NULL"))
                conn.execute(text('UPDATE knowledge SET published_at = created_at WHERE published_at IS NULL'))
            if 'scheduled_at' not in knowledge_cols:
                conn.execute(text('ALTER TABLE knowledge ADD COLUMN scheduled_at DATETIME'))
            if 'published_at' not in knowledge_cols:
                conn.execute(text('ALTER TABLE knowledge ADD COLUMN published_at DATETIME'))
                conn.execute(text('UPDATE knowledge SET published_at = created_at WHERE published_at IS NULL'))
            # Index for the publisher loop's hot path: "give me
            # scheduled rows whose scheduled_at <= now". Without the
            # index the loop becomes O(N) over the whole table.
            conn.execute(text('CREATE INDEX IF NOT EXISTS ix_knowledge_status_scheduled ON knowledge (status, scheduled_at)'))

            comments_cols = {c['name'] for c in inspector.get_columns('comments')} if inspector.has_table('comments') else set()
            if 'updated_at' not in comments_cols:
                conn.execute(text('ALTER TABLE comments ADD COLUMN updated_at DATETIME'))

    # Seed a default admin only in development or when explicitly requested.
    # In production we want the first registered user to become admin instead
    # of blocking registration with a pre-seeded admin account.
    db = SessionLocal()
    try:
        has_admin = db.query(User).filter(User.role == 'admin').first()
        app_env = os.getenv('APP_ENV', 'development').lower()
        seed_default_admin = os.getenv('SEED_DEFAULT_ADMIN', 'false').lower() in ('1', 'true', 'yes')

        if not has_admin and (app_env != 'production' or seed_default_admin):
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

