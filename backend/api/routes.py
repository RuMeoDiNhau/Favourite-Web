from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.services.face_service import recognize_face
from backend.services.db_service import create_user, get_users, get_logs
from backend.services.db_models import SessionLocal
from backend.services.schemas import (
    RecognizeRequest, EnrollmentRequest,
    GameResponse, GameCreateRequest,
    MusicResponse, PlaylistResponse, MusicCreateRequest,
    KnowledgeResponse, KnowledgeCreateRequest
)
from backend.services import games_service, music_service, knowledge_service

router = APIRouter(prefix='/api/v1')

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==================== Face Recognition Endpoints ====================

@router.post('/recognize')
def recognize(request: RecognizeRequest):
    return recognize_face(request.image_base64)

@router.post('/users', status_code=201)
def enroll_user(request: EnrollmentRequest):
    result = create_user(
        user_id=request.user_id,
        name=request.name,
        department=request.department,
        images_base64=request.images_base64,
    )
    if result['status'] == 'error':
        raise HTTPException(status_code=400, detail=result['message'])
    return result

@router.get('/users')
def list_users(page: int = 1, limit: int = 10):
    return get_users(page=page, limit=limit)

@router.get('/logs')
def list_logs():
    return get_logs()


# ==================== Games Endpoints ====================

@router.get('/games', response_model=list[GameResponse])
def get_games(db: Session = Depends(get_db)):
    """Get all games"""
    games_service.init_games(db)
    return games_service.get_all_games(db)

# Specific routes MUST come before wildcard routes
@router.get('/games/popular/trending', response_model=list[GameResponse])
def get_popular_games(db: Session = Depends(get_db)):
    """Get popular games"""
    games_service.init_games(db)
    return games_service.get_popular_games(db)

@router.get('/games/new/latest', response_model=list[GameResponse])
def get_new_games(db: Session = Depends(get_db)):
    """Get newest games"""
    games_service.init_games(db)
    return games_service.get_new_games(db)

@router.get('/games/category/{category}', response_model=list[GameResponse])
def get_games_by_category(category: str, db: Session = Depends(get_db)):
    """Get games by category"""
    games_service.init_games(db)
    return games_service.get_games_by_category(db, category)

# Wildcard route comes last
@router.get('/games/{game_id}', response_model=GameResponse)
def get_game(game_id: int, db: Session = Depends(get_db)):
    """Get game by ID"""
    game = games_service.get_game_by_id(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail='Game not found')
    return game

@router.post('/games', response_model=GameResponse, status_code=201)
def create_game(request: GameCreateRequest, db: Session = Depends(get_db)):
    """Create a new game"""
    return games_service.create_game(
        db, 
        name=request.name,
        category=request.category,
        description=request.description,
        image_url=request.image_url
    )

@router.post('/games/{game_id}/play')
def play_game(game_id: int, db: Session = Depends(get_db)):
    """Increment game plays"""
    game = games_service.update_game_plays(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail='Game not found')
    return {'message': 'Play count updated', 'plays': game.plays}

@router.post('/games/{game_id}/like')
def like_game(game_id: int, db: Session = Depends(get_db)):
    """Increment game likes"""
    game = games_service.update_game_likes(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail='Game not found')
    return {'message': 'Like count updated', 'likes': game.likes}


# ==================== Music Endpoints ====================

@router.get('/playlists', response_model=list[PlaylistResponse])
def get_playlists(db: Session = Depends(get_db)):
    """Get all playlists"""
    music_service.init_playlists_and_music(db)
    return music_service.get_all_playlists(db)

@router.get('/music', response_model=list[MusicResponse])
def get_all_music(db: Session = Depends(get_db)):
    """Get all songs"""
    music_service.init_playlists_and_music(db)
    return music_service.get_all_songs(db)

# Specific routes MUST come before wildcard routes
@router.get('/music/popular/trending', response_model=list[MusicResponse])
def get_popular_songs(db: Session = Depends(get_db)):
    """Get popular songs"""
    music_service.init_playlists_and_music(db)
    return music_service.get_popular_songs(db)

@router.get('/music/new/latest', response_model=list[MusicResponse])
def get_new_songs(db: Session = Depends(get_db)):
    """Get newest songs"""
    music_service.init_playlists_and_music(db)
    return music_service.get_new_songs(db)

@router.get('/music/genre/{genre}', response_model=list[MusicResponse])
def get_music_by_genre(genre: str, db: Session = Depends(get_db)):
    """Get songs by genre"""
    return music_service.get_songs_by_genre(db, genre)

# Wildcard route comes last
@router.get('/music/{song_id}', response_model=MusicResponse)
def get_song(song_id: int, db: Session = Depends(get_db)):
    """Get song by ID"""
    song = music_service.get_song_by_id(db, song_id)
    if not song:
        raise HTTPException(status_code=404, detail='Song not found')
    return song

@router.post('/music', response_model=MusicResponse, status_code=201)
def create_song(request: MusicCreateRequest, db: Session = Depends(get_db)):
    """Create a new song"""
    return music_service.create_song(
        db,
        title=request.title,
        artist=request.artist,
        duration=request.duration,
        genre=request.genre,
        playlist_id=request.playlist_id
    )

@router.post('/music/{song_id}/play')
def play_song(song_id: int, db: Session = Depends(get_db)):
    """Increment song plays"""
    song = music_service.update_song_plays(db, song_id)
    if not song:
        raise HTTPException(status_code=404, detail='Song not found')
    return {'message': 'Play count updated', 'plays': song.plays}

@router.post('/music/{song_id}/like')
def like_song(song_id: int, db: Session = Depends(get_db)):
    """Increment song likes"""
    song = music_service.update_song_likes(db, song_id)
    if not song:
        raise HTTPException(status_code=404, detail='Song not found')
    return {'message': 'Like count updated', 'likes': song.likes}


# ==================== Knowledge Endpoints ====================

@router.get('/knowledge', response_model=list[KnowledgeResponse])
def get_all_knowledge(db: Session = Depends(get_db)):
    """Get all articles"""
    knowledge_service.init_articles(db)
    return knowledge_service.get_all_articles(db)

# Specific routes MUST come before wildcard routes
@router.get('/knowledge/categories')
def get_categories(db: Session = Depends(get_db)):
    """Get all categories"""
    knowledge_service.init_articles(db)
    categories = knowledge_service.get_categories(db)
    return {'categories': [cat[0] for cat in categories]}

@router.get('/knowledge/popular/trending', response_model=list[KnowledgeResponse])
def get_popular_articles(db: Session = Depends(get_db)):
    """Get popular articles"""
    knowledge_service.init_articles(db)
    return knowledge_service.get_popular_articles(db)

@router.get('/knowledge/trending/hot', response_model=list[KnowledgeResponse])
def get_trending_articles(db: Session = Depends(get_db)):
    """Get trending articles"""
    knowledge_service.init_articles(db)
    return knowledge_service.get_trending_articles(db)

@router.get('/knowledge/category/{category}', response_model=list[KnowledgeResponse])
def get_knowledge_by_category(category: str, db: Session = Depends(get_db)):
    """Get articles by category"""
    knowledge_service.init_articles(db)
    return knowledge_service.get_articles_by_category(db, category)

@router.get('/knowledge/search/{query}', response_model=list[KnowledgeResponse])
def search_knowledge(query: str, db: Session = Depends(get_db)):
    """Search articles"""
    knowledge_service.init_articles(db)
    return knowledge_service.search_articles(db, query)

# Wildcard route comes last
@router.get('/knowledge/{article_id}', response_model=KnowledgeResponse)
def get_article(article_id: int, db: Session = Depends(get_db)):
    """Get article by ID and increment views"""
    article = knowledge_service.get_article_by_id(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail='Article not found')
    return article

@router.post('/knowledge', response_model=KnowledgeResponse, status_code=201)
def create_article(request: KnowledgeCreateRequest, db: Session = Depends(get_db)):
    """Create a new article"""
    return knowledge_service.create_article(
        db,
        title=request.title,
        category=request.category,
        description=request.description,
        content=request.content,
        author=request.author
    )

@router.post('/knowledge/{article_id}/like')
def like_article(article_id: int, db: Session = Depends(get_db)):
    """Increment article likes"""
    article = knowledge_service.update_article_likes(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail='Article not found')
    return {'message': 'Like count updated', 'likes': article.likes}
