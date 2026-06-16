from sqlalchemy.orm import Session
from backend.services.db_models import Game

# Sample game data
SAMPLE_GAMES = [
    {
        "name": "Puzzle Master",
        "category": "Puzzle",
        "description": "Giải những câu đố hấp dẫn",
        "image_url": "🎯",
        "plays": 150,
        "likes": 45
    },
    {
        "name": "Speed Rush",
        "category": "Action",
        "description": "Đua với thời gian",
        "image_url": "⚡",
        "plays": 280,
        "likes": 62
    },
    {
        "name": "Quiz Battle",
        "category": "Quiz",
        "description": "Thử thách kiến thức",
        "image_url": "🏆",
        "plays": 320,
        "likes": 95
    },
    {
        "name": "Lucky Dice",
        "category": "Casual",
        "description": "Thử vận may của bạn",
        "image_url": "🎲",
        "plays": 200,
        "likes": 50
    },
    {
        "name": "Flappy Bird",
        "category": "Arcade",
        "description": "Điều khiển chim vượt qua chướng ngại vật",
        "image_url": "🌟",
        "plays": 450,
        "likes": 120
    },
    {
        "name": "Candy Crush",
        "category": "Puzzle",
        "description": "Sắp xếp kẹo thành hàng",
        "image_url": "🎪",
        "plays": 520,
        "likes": 150
    },
]


def init_games(db: Session):
    """Initialize sample games if database is empty"""
    existing_games = db.query(Game).count()
    if existing_games == 0:
        for game_data in SAMPLE_GAMES:
            game = Game(**game_data)
            db.add(game)
        db.commit()


def get_all_games(db: Session, limit: int = 100):
    """Get all games"""
    return db.query(Game).limit(limit).all()


def get_games_by_category(db: Session, category: str):
    """Get games by category"""
    return db.query(Game).filter(Game.category == category).all()


def get_game_by_id(db: Session, game_id: int):
    """Get game by ID"""
    return db.query(Game).filter(Game.id == game_id).first()


def create_game(db: Session, name: str, category: str, description: str, image_url: str = None):
    """Create a new game"""
    game = Game(name=name, category=category, description=description, image_url=image_url)
    db.add(game)
    db.commit()
    db.refresh(game)
    return game


def update_game_plays(db: Session, game_id: int):
    """Increment game plays"""
    game = db.query(Game).filter(Game.id == game_id).first()
    if game:
        game.plays += 1
        db.commit()
        db.refresh(game)
    return game


def update_game_likes(db: Session, game_id: int):
    """Increment game likes"""
    game = db.query(Game).filter(Game.id == game_id).first()
    if game:
        game.likes += 1
        db.commit()
        db.refresh(game)
    return game


def get_popular_games(db: Session, limit: int = 4):
    """Get most popular games by likes"""
    return db.query(Game).order_by(Game.likes.desc()).limit(limit).all()


def get_new_games(db: Session, limit: int = 4):
    """Get newest games"""
    return db.query(Game).order_by(Game.created_at.desc()).limit(limit).all()
