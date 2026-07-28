from sqlalchemy.orm import Session
from backend.services.db_models import Game

# Sample game post data
SAMPLE_GAMES = []


def init_games(db: Session):
    """Initialize sample game posts if database is empty"""
    pass


def get_all_games(db: Session, limit: int = 100):
    """Get all game posts"""
    return db.query(Game).order_by(Game.created_at.desc()).limit(limit).all()


def get_games_by_category(db: Session, category: str):
    """Get game posts by category"""
    return db.query(Game).filter(Game.category == category).all()


def get_game_by_id(db: Session, game_id: int):
    """Get game post by ID"""
    return db.query(Game).filter(Game.id == game_id).first()


def create_game(db: Session, title: str, category: str, description: str, content: str = None, image_url: str = None):
    """Create a new game post"""
    game = Game(title=title, category=category, description=description, content=content, image_url=image_url)
    db.add(game)
    db.commit()
    db.refresh(game)
    return game


def update_game_views(db: Session, game_id: int):
    """Increment game post views"""
    game = db.query(Game).filter(Game.id == game_id).first()
    if game:
        game.views += 1
        db.commit()
        db.refresh(game)
    return game


def update_game_likes(db: Session, game_id: int):
    """Increment game post likes"""
    game = db.query(Game).filter(Game.id == game_id).first()
    if game:
        game.likes += 1
        db.commit()
        db.refresh(game)
    return game


def get_popular_games(db: Session, limit: int = 4):
    """Get most popular game posts by likes"""
    return db.query(Game).order_by(Game.likes.desc()).limit(limit).all()


def get_new_games(db: Session, limit: int = 4):
    """Get newest game posts"""
    return db.query(Game).order_by(Game.created_at.desc()).limit(limit).all()


def delete_game(db: Session, game_id: int, user_id: str = None, is_admin: bool = False) -> bool:
    """Delete a game blog post by ID. Admin or Author can delete it."""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        return False
    if hasattr(game, 'author_user_id') and game.author_user_id and str(game.author_user_id) != str(user_id) and not is_admin:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa bài viết game này.")
    db.delete(game)
    db.commit()
    return True
