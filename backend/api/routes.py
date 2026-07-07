import jwt
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.services.face_service import recognize_face
from backend.services.db_service import create_user, get_users, get_logs, verify_user_credentials, get_user_by_user_id, add_face_images
from backend.services.db_models import SessionLocal, DATA_RAW_DIR
from backend.services.schemas import (
    RecognizeRequest, EnrollmentRequest,
    GameResponse, GameCreateRequest,
    MusicResponse, PlaylistResponse, MusicCreateRequest, PlaylistCreateRequest,
    KnowledgeResponse, KnowledgeCreateRequest,
    LoginRequest, FaceLoginRequest,
    PostResponse, PostCreateRequest
)
from backend.services import games_service, music_service, knowledge_service, posts_service
from backend.services.auth_service import create_access_token, decode_access_token
from backend.services.logging_service import logger

router = APIRouter(prefix='/api/v1')

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# JWT Token extraction and authentication dependencies
security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    x_user_id: str = Header(None)
):
    token = None
    if credentials:
        token = credentials.credentials
    elif x_user_id:
        # Fallback/Backward compatibility for header token
        if x_user_id.startswith("Bearer "):
            token = x_user_id.replace("Bearer ", "")
        else:
            token = x_user_id

    if not token:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập")

    try:
        payload = decode_access_token(token)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Mã xác thực đã hết hạn, vui lòng đăng nhập lại")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Mã xác thực không hợp lệ")

def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện hành động này")
    return current_user


# ==================== Face Recognition Endpoints ====================

@router.post('/recognize')
def recognize(request: RecognizeRequest):
    return recognize_face(request.image_base64)

@router.post('/users', status_code=201)
def enroll_user(request: EnrollmentRequest):
    result = create_user(
        user_id=request.user_id,
        name=request.name,
        email=request.email,
        password=request.password,
        department=request.department,
        images_base64=request.images_base64,
    )
    if result['status'] == 'error':
        logger.warning(f"Failed to enroll user {request.user_id}: {result['message']}")
        raise HTTPException(status_code=400, detail=result['message'])
    logger.info(f"Successfully enrolled new user: {request.user_id} (Name: {request.name})")
    return result

@router.get('/users')
def list_users(page: int = 1, limit: int = 10, admin: dict = Depends(get_admin_user)):
    return get_users(page=page, limit=limit)

@router.get('/logs')
def list_logs(admin: dict = Depends(get_admin_user)):
    return get_logs()


def get_user_avatar_url(user_id: str) -> str:
    user_dir = DATA_RAW_DIR / user_id
    if user_dir.exists():
        images = list(user_dir.glob('*.png')) + list(user_dir.glob('*.jpg'))
        if images:
            first_image = sorted(images)[0]
            return f"/raw_images/{user_id}/{first_image.name}"
    return None


# ==================== Authentication Endpoints ====================

@router.post('/auth/login')
def login(request: LoginRequest):
    user = verify_user_credentials(request.username_or_email, request.password)
    if not user:
        logger.warning(f"Failed password login attempt for: {request.username_or_email}")
        raise HTTPException(status_code=401, detail='Tài khoản hoặc mật khẩu không chính xác')
    
    # Tạo JWT token mã hóa user_id và role
    token = create_access_token(data={"user_id": user.user_id, "role": user.role})
    logger.info(f"User logged in successfully via password: {user.user_id} (Role: {user.role})")
    return {
        'status': 'success',
        'token': token,
        'user': {
            'user_id': user.user_id,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'registered_images': user.registered_images,
            'avatar_url': get_user_avatar_url(user.user_id)
        }
    }

@router.post('/auth/login-face')
def login_face(request: FaceLoginRequest):
    try:
        result = recognize_face(request.image_base64)
        if result['status'] == 'success':
            user_id = result['data']['user_id']
            user = get_user_by_user_id(user_id)
            if user:
                # Tạo JWT token mã hóa user_id và role
                token = create_access_token(data={"user_id": user.user_id, "role": user.role})
                logger.info(f"User logged in successfully via Face ID: {user.user_id} (Confidence: {result['data'].get('confidence', 'N/A')})")
                return {
                    'status': 'success',
                    'token': token,
                    'user': {
                        'user_id': user.user_id,
                        'name': user.name,
                        'email': user.email,
                        'role': user.role,
                        'registered_images': user.registered_images,
                        'avatar_url': get_user_avatar_url(user.user_id)
                    }
                }
    except Exception as e:
        logger.error(f"Error during Face ID login execution: {e}")
    logger.warning("Failed Face ID login attempt (unrecognized face or stranger).")
    raise HTTPException(status_code=401, detail='Không nhận diện được khuôn mặt hoặc người lạ')


class RegisterFaceRequest(BaseModel):
    images_base64: list


@router.post('/users/me/register-face')
def register_my_face(
    request: RegisterFaceRequest,
    current_user: dict = Depends(get_current_user)
):
    """User tự đăng ký khuôn mặt sau khi đã có tài khoản."""
    user_id = current_user.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail='Không xác định được tài khoản')
    if not request.images_base64:
        raise HTTPException(status_code=400, detail='Vui lòng cung cấp ít nhất 1 ảnh')

    result = add_face_images(user_id, request.images_base64)
    if result['status'] == 'error':
        logger.warning(f"User {user_id} failed to register face: {result['message']}")
        raise HTTPException(status_code=400, detail=result['message'])
    logger.info(f"User {user_id} successfully registered {len(request.images_base64)} new face images. Total: {result.get('data', {}).get('total_registered_images', 'N/A')}")
    return result


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
    """Create a new game post"""
    return games_service.create_game(
        db, 
        title=request.title,
        category=request.category,
        description=request.description,
        content=request.content,
        image_url=request.image_url
    )

@router.post('/games/{game_id}/view')
def view_game(game_id: int, db: Session = Depends(get_db)):
    """Increment game post views"""
    game = games_service.update_game_views(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail='Game post not found')
    return {'message': 'View count updated', 'views': game.views}

@router.post('/games/{game_id}/like')
def like_game(game_id: int, db: Session = Depends(get_db)):
    """Increment game post likes"""
    game = games_service.update_game_likes(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail='Game post not found')
    return {'message': 'Like count updated', 'likes': game.likes}


# ==================== Music Endpoints ====================

@router.get('/playlists', response_model=list[PlaylistResponse])
def get_playlists(db: Session = Depends(get_db)):
    """Get all playlists"""
    music_service.init_playlists_and_music(db)
    return music_service.get_all_playlists(db)

@router.post('/playlists', response_model=PlaylistResponse, status_code=201)
def create_playlist(request: PlaylistCreateRequest, db: Session = Depends(get_db)):
    """Create a new playlist"""
    return music_service.create_playlist(
        db,
        name=request.name,
        description=request.description,
        image_url=request.image_url
    )

@router.delete('/playlists/{playlist_id}', status_code=200)
def delete_playlist(playlist_id: int, admin: dict = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Delete a playlist (Admin only)"""
    success = music_service.delete_playlist(db, playlist_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh sách phát")
    return {"message": "Đã xóa danh sách phát thành công"}

@router.get('/playlists/{playlist_id}/songs', response_model=list[MusicResponse])
def get_playlist_songs(playlist_id: int, db: Session = Depends(get_db)):
    """Get all songs in a specific playlist"""
    playlist = music_service.get_playlist_by_id(db, playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh sách phát")
    return music_service.get_songs_by_playlist(db, playlist_id)

@router.post('/playlists/{playlist_id}/songs/{song_id}', status_code=200)
def add_song_to_playlist(playlist_id: int, song_id: int, db: Session = Depends(get_db)):
    """Add a song to a playlist"""
    success = music_service.add_song_to_playlist(db, playlist_id, song_id)
    if not success:
        raise HTTPException(status_code=400, detail="Không thể thêm bài hát vào danh sách phát. Hãy kiểm tra lại ID bài hát hoặc playlist.")
    return {"message": "Đã thêm bài hát vào danh sách phát thành công"}

@router.delete('/playlists/songs/{song_id}', status_code=200)
def remove_song_from_playlist(song_id: int, db: Session = Depends(get_db)):
    """Remove a song from its current playlist"""
    success = music_service.remove_song_from_playlist(db, song_id)
    if not success:
        raise HTTPException(status_code=400, detail="Bài hát không nằm trong danh sách phát nào hoặc ID bài hát không đúng.")
    return {"message": "Đã xóa bài hát khỏi danh sách phát thành công"}

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
def create_song(
    request: MusicCreateRequest,
    admin: dict = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new song (Admin only)"""
    return music_service.create_song(
        db,
        title=request.title,
        artist=request.artist,
        duration=request.duration,
        genre=request.genre,
        file_url=request.file_url,
        playlist_id=request.playlist_id
    )

@router.delete('/music/{song_id}', status_code=200)
def delete_song(song_id: int, admin: dict = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Delete a song by ID (Admin only)"""
    success = music_service.delete_song(db, song_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài hát")
    return {"message": "Đã xóa bài hát thành công"}

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

@router.get('/knowledge/search', response_model=list[KnowledgeResponse])
def search_knowledge(q: str, db: Session = Depends(get_db)):
    """Search articles by free-text query (`?q=...`)."""
    knowledge_service.init_articles(db)
    return knowledge_service.search_articles(db, q)

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


# ==================== Unified Post Endpoints ====================

@router.post('/posts/upload')
async def upload_post_file(
    file: UploadFile = File(...),
    post_type: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        file_bytes = await file.read()
        media_url = posts_service.upload_media_file(file_bytes, file.filename, post_type)
        return {"media_url": media_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tải file: {str(e)}")


@router.post('/posts', response_model=PostResponse, status_code=201)
def create_post(
    request: PostCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return posts_service.create_post(db, request, current_user.get("user_id"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo bài đăng: {str(e)}")


@router.get('/posts', response_model=list[PostResponse])
def get_posts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return posts_service.get_posts(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách bài đăng: {str(e)}")
