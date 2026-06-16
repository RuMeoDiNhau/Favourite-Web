from sqlalchemy.orm import Session
from backend.services.db_models import Knowledge

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


def get_article_by_id(db: Session, article_id: int):
    """Get article by ID"""
    article = db.query(Knowledge).filter(Knowledge.id == article_id).first()
    if article:
        # Increment views when article is viewed
        article.views += 1
        db.commit()
        db.refresh(article)
    return article


def create_article(db: Session, title: str, category: str, description: str, content: str, author: str):
    """Create a new article"""
    article = Knowledge(title=title, category=category, description=description, content=content, author=author)
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
