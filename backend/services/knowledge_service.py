from sqlalchemy.orm import Session
from backend.services.db_models import Knowledge
from backend.services.schemas import VideoItem
import os
import requests
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=BASE_DIR / ".env")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

# Sample knowledge articles
SAMPLE_ARTICLES = [
    {
        "title": "Học Lập Trình Web",
        "category": "Lập Trình",
        "description": "Hướng dẫn chi tiết về HTML, CSS, JavaScript",
        "content": "Bắt đầu từ HTML, CSS, sau đó JavaScript. Học về DOM, Events, Async/Await...",
        "author": "Nguyễn Văn A",
        "views": 1250,
        "likes": 45
    },
    {
        "title": "Mẹo Quản Lý Thời Gian",
        "category": "Kỹ Năng",
        "description": "Các phương pháp hiệu quả để quản lý công việc",
        "content": "Sử dụng Pomodoro Technique, To-do list, Priority Matrix...",
        "author": "Trần Thị B",
        "views": 890,
        "likes": 32
    },
    {
        "title": "Thiết Kế UI/UX Cơ Bản",
        "category": "Thiết Kế",
        "description": "Nguyên tắc và kỹ thuật thiết kế giao diện",
        "content": "Điều hòa màu sắc, Typography, Spacing, Accessibility...",
        "author": "Lê Văn C",
        "views": 2100,
        "likes": 67
    },
    {
        "title": "Kinh Doanh Online Hiệu Quả",
        "category": "Kinh Doanh",
        "description": "Chiến lược bán hàng online thành công",
        "content": "Xây dựng brand, Marketing strategy, Customer service...",
        "author": "Phạm Văn D",
        "views": 1540,
        "likes": 52
    },
    {
        "title": "Phát Triển Cá Nhân",
        "category": "Phát Triển",
        "description": "Hành trình phát triển bản thân và sự nghiệp",
        "content": "Đặt mục tiêu, Tự học, Networking, Building portfolio...",
        "author": "Hoàng Thị E",
        "views": 3200,
        "likes": 89
    },
    {
        "title": "Lập Kế Hoạch Tài Chính",
        "category": "Tài Chính",
        "description": "Quản lý tiền bạc và lập kế hoạch chi tiêu",
        "content": "Budget planning, Saving, Investment, Risk management...",
        "author": "Đỗ Văn F",
        "views": 956,
        "likes": 38
    },
    {
        "title": "Cách Viết Content Hiệu Quả",
        "category": "Lập Trình",
        "description": "Hướng dẫn viết content thu hút người dùng",
        "content": "SEO optimization, Storytelling, Call to action...",
        "author": "Võ Văn G",
        "views": 1850,
        "likes": 74
    },
    {
        "title": "Machine Learning Cơ Bản",
        "category": "Lập Trình",
        "description": "Giới thiệu về Machine Learning và ứng dụng",
        "content": "Supervised learning, Unsupervised learning, Deep learning...",
        "author": "Bùi Văn H",
        "views": 2450,
        "likes": 105
    },
]


def init_articles(db: Session):
    """Initialize sample articles if database is empty"""
    existing_articles = db.query(Knowledge).count()
    if existing_articles == 0:
        for article_data in SAMPLE_ARTICLES:
            article = Knowledge(**article_data)
            db.add(article)
        db.commit()


def get_all_articles(db: Session, limit: int = 100):
    """Get all articles"""
    return db.query(Knowledge).order_by(Knowledge.created_at.desc()).limit(limit).all()


def get_articles_by_category(db: Session, category: str):
    """Get articles by category"""
    return db.query(Knowledge).filter(Knowledge.category == category).order_by(Knowledge.created_at.desc()).all()


def get_article_by_id(db: Session, article_id: int, user_id: str = None):
    """Get article by ID. Bumps the global view counter and, if a
    user_id is provided, also records a per-user view event for the
    Personal Dashboard. The user_id arg is optional (None = anonymous
    request) — keeps the call site compatible with code that doesn't
    have auth context."""
    article = db.query(Knowledge).filter(Knowledge.id == article_id).first()
    if article:
        # Increment global view counter
        article.views += 1
        db.commit()
        db.refresh(article)
        # Record per-user event when the caller is signed in. Lazy
        # import to avoid a circular dependency: dashboard_service
        # imports Knowledge from db_models.
        if user_id:
            try:
                from backend.services.dashboard_service import record_event
                record_event(db, user_id, 'knowledge', article_id, 'view')
            except Exception as ev_err:
                print(f'[knowledge_service] Failed to record view event: {ev_err}')
    return article


def create_article(db: Session, title: str, category: str, description: str, content: str, author: str):
    """Create a new article. Sets author_user_id to `author` when it
    looks like a User.user_id (alphanumeric, ≤50 chars) — that's the
    signal the route layer passes current_user.user_id; legacy callers
    pass a display name like "Bùi Văn H" which we leave as the legacy
    `author` field and skip author_user_id. The comment notification
    uses author_user_id to find the recipient."""
    author_user_id = author if (author and len(author) <= 50 and author.replace('_', '').isalnum()) else None
    article = Knowledge(
        title=title,
        category=category,
        description=description,
        content=content,
        author=author,
        author_user_id=author_user_id,
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


def update_article_likes(db: Session, article_id: int):
    """Increment article likes"""
    article = db.query(Knowledge).filter(Knowledge.id == article_id).first()
    if article:
        article.likes += 1
        db.commit()
        db.refresh(article)
    return article


def get_popular_articles(db: Session, limit: int = 10):
    """Get most popular articles by views"""
    return db.query(Knowledge).order_by(Knowledge.views.desc()).limit(limit).all()


def get_trending_articles(db: Session, limit: int = 5):
    """Get trending articles by likes"""
    return db.query(Knowledge).order_by(Knowledge.likes.desc()).limit(limit).all()


def search_articles(db: Session, query: str):
    """Search articles by title or description"""
    return db.query(Knowledge).filter(
        (Knowledge.title.ilike(f"%{query}%")) | 
        (Knowledge.description.ilike(f"%{query}%"))
    ).all()


def get_categories(db: Session):
    """Get all unique categories"""
    return db.query(Knowledge.category).distinct().all()


def _youtube_query_for(article) -> str:
    """Build a YouTube search query from an article. Title alone is too narrow
    when titles are short like "Machine Learning Cơ Bản"; combining with the
    category adds Vietnamese context that surfaces better tutorials."""
    parts = [article.title]
    if article.category:
        parts.append(f"hướng dẫn {article.category}")
    return " ".join(parts)


def search_youtube_videos(article, max_results: int = 3) -> list[VideoItem]:
    """Search YouTube for short, embed-friendly videos related to an article.

    Returns an empty list if YOUTUBE_API_KEY is unset or the upstream call
    fails. The caller (route handler) should treat an empty list as a soft
    failure — the FE renders "no related videos" gracefully instead of an
    error banner. We never raise here so a missing key does not 500 the
    knowledge view.
    """
    if not YOUTUBE_API_KEY:
        print("[knowledge_service] YOUTUBE_API_KEY not set; skipping video lookup")
        return []

    query = _youtube_query_for(article)
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max_results,
        "relevanceLanguage": "vi",
        "safeSearch": "strict",
        "key": YOUTUBE_API_KEY,
    }
    try:
        resp = requests.get(YOUTUBE_SEARCH_URL, params=params, timeout=5)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[knowledge_service] YouTube search failed: {e}")
        return []

    items = resp.json().get("items", [])
    results = []
    for item in items:
        # Prefer videoId; some items (channels/playlists) lack it — skip them.
        vid = item.get("id", {}).get("videoId")
        if not vid:
            continue
        snippet = item.get("snippet", {})
        results.append(VideoItem(
            videoId=vid,
            title=snippet.get("title", ""),
            channel=snippet.get("channelTitle", ""),
        ))
    return results
