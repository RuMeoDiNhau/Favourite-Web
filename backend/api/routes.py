import jwt
import os
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File, Form, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import func
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
    PostResponse, PostCreateRequest,
    VideoListResponse,
    CommentCreateRequest, CommentUpdateRequest, CommentResponse, ReactionRequest, ReactionSummary,
    NotificationResponse, NotificationList, UnreadCount,
    CollectionCreateRequest, CollectionUpdateRequest, CollectionItemRequest,
)
from backend.services import games_service, music_service, knowledge_service, posts_service, dashboard_service, search_service, comments_service, notification_service, bookmarks_service, follow_service, collections_service, tags_service
from backend.services.auth_service import create_access_token, decode_access_token
from backend.services.logging_service import logger

router = APIRouter(prefix='/api/v1')


# Cookie name used to carry the JWT. Stays in one constant so we
# don't drift between login (set), auth deps (read), and logout
# (clear). The browser sends this on every same-site request so
# the FE never has to handle the token in JS.
AUTH_COOKIE_NAME = 'fw_auth'

# Cookie attributes. The two flags that actually matter for XSS
# hardening:
#   HttpOnly: blocks `document.cookie` reads, so a script-injected
#             attacker can't grab the JWT.
#   SameSite=Lax: stops the cookie from being attached on
#             cross-site POSTs (CSRF surface). We don't use Strict
#             because the FE needs to navigate cross-origin in dev
#             (Vite on 5173, backend on 8000) and Strict would block
#             the auth cookie on first-load.
# Secure is only honored over HTTPS (the browser drops the cookie
# otherwise). We detect "secure eligible" via APP_ENV=production so
# local dev (http://localhost) doesn't lose its cookie.
def _is_secure_cookie() -> bool:
    return os.getenv('APP_ENV', 'development') == 'production'


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=_is_secure_cookie(),
        samesite='lax',
        path='/',
        max_age=7 * 24 * 60 * 60,  # 7 days, matches token expiry
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(key=AUTH_COOKIE_NAME, path='/')

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# JWT Token extraction and authentication dependencies
#
# Two sources of truth for the token, ordered:
#   1. The fw_auth httpOnly cookie (primary). Set by /auth/login,
#      cleared by /auth/logout, attached by the browser on every
#      same-site request. The FE doesn't read it — JS can't, by design.
#   2. The Authorization: Bearer header. Kept for direct API callers
#      (curl, Swagger, scripts) — the FE never sets it.
#
# The previous X-Auth-Token fallback was added to support <img>/<audio>
# tags whose src URLs pointed at authed endpoints. After Commit A,
# all media URLs go through public paths (/static/uploads/* mounted
# as StaticFiles, or S3 buckets), so the fallback has no callers.
# Dropping it removes the only path where a JS-controllable header
# was attached to every outgoing request from the FE.

security = HTTPBearer(auto_error=False)


def _extract_token(
    request_cookies,
    credentials: HTTPAuthorizationCredentials | None,
) -> str | None:
    # 1. Cookie — set by the server, browser auto-attaches.
    if request_cookies and request_cookies.get(AUTH_COOKIE_NAME):
        return request_cookies.get(AUTH_COOKIE_NAME)
    # 2. Authorization header — only ever set by curl/Swagger/etc.
    if credentials:
        return credentials.credentials
    return None


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = _extract_token(request.cookies, credentials)

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


def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Like get_current_user but returns None when no valid token is
    present instead of raising 401. Used for endpoints that should
    work for both signed-in and anonymous users (e.g. view/like/play
    bumps the global counter either way, but only the signed-in case
    writes a per-user event for the Personal Dashboard)."""
    token = _extract_token(request.cookies, credentials)
    if not token:
        return None
    try:
        return decode_access_token(token)
    except jwt.PyJWTError:
        return None


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


@router.get('/users/{user_id}/profile')
def get_user_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict | None = Depends(get_optional_user),
):
    """Public read-only profile for any user. Returns the user's
    display fields plus a small stats block (articles owned, posts
    authored, comments written, total likes received on knowledge
    articles). Used by the FE's UserProfile page; it also doubles as
    the target of any 'click a username' link.

    Privacy: we deliberately don't expose email or registered image
    count. Email is admin-only via the existing /users list;
    registered_images is internal enrollment bookkeeping."""
    user = get_user_by_user_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail='user not found')

    # Stats: each count is a single SELECT COUNT(*) over the relevant
    # table. We don't cache or denormalize because the user base is
    # small enough that a 4-query latency cost is fine and the
    # numbers stay perfectly fresh on every page view.
    from backend.services.db_models import Knowledge, Post, Comment
    articles_owned = db.query(Knowledge).filter(Knowledge.author_user_id == user_id).count()
    posts_authored = db.query(Post).filter(Post.user_id == user_id).count()
    comments_written = db.query(Comment).filter(Comment.user_id == user_id).count()
    # Total likes received on this user's knowledge articles. We sum
    # Knowledge.likes for the articles they authored — single query.
    total_likes = (
        db.query(func.coalesce(func.sum(Knowledge.likes), 0))
        .filter(Knowledge.author_user_id == user_id)
        .scalar() or 0
    )

    return {
        'user_id': user.user_id,
        'name': user.name,
        'department': user.department,
        'role': user.role,
        'avatar_url': get_user_avatar_url(user.user_id),
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'stats': {
            'articles_owned': articles_owned,
            'posts_authored': posts_authored,
            'comments_written': comments_written,
            'total_likes': int(total_likes),
        },
        # Follow counts — kept on the profile payload so the FE doesn't
        # need a second round-trip to render "12 người theo dõi". The
        # current viewer's perspective is added by the route below so
        # we know which button to show ("Theo dõi" vs "Đang theo dõi").
        'follow': follow_service.follow_counts(db, user_id),
        # `is_following` is only meaningful for an authenticated viewer
        # who isn't viewing their own profile. Anonymous viewers get
        # False (the FE will hide the button); self-viewers also get
        # False (you don't follow yourself).
        'is_following': (
            follow_service.is_following(db, current_user['user_id'], user_id)
            if current_user and current_user['user_id'] != user_id
            else False
        ),
    }


@router.post('/users/{user_id}/follow')
def follow_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Toggle-on follow. Authenticated only — you can't follow as a
    guest. Self-follow and unknown-target both surface as 400 via
    FollowError. Idempotent: re-following returns 200 with the same
    payload as a fresh follow."""
    try:
        follow_service.follow(db, current_user['user_id'], user_id)
    except follow_service.FollowError as e:
        raise HTTPException(status_code=400, detail=str(e))
    counts = follow_service.follow_counts(db, user_id)
    return {
        'user_id': user_id,
        'is_following': True,
        'followers': counts['followers'],
        'following': counts['following'],
    }


@router.delete('/users/{user_id}/follow')
def unfollow_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Toggle-off follow. Symmetric to follow_user — same response
    shape, is_following flips to False. Idempotent."""
    follow_service.unfollow(db, current_user['user_id'], user_id)
    counts = follow_service.follow_counts(db, user_id)
    return {
        'user_id': user_id,
        'is_following': False,
        'followers': counts['followers'],
        'following': counts['following'],
    }


@router.get('/users/{user_id}/followers')
def get_followers(
    user_id: str,
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    """Public list of users following `user_id`. Capped at 200 by the
    service to keep the wire payload bounded."""
    limit = min(max(limit, 1), 200)
    return {
        'user_id': user_id,
        'followers': follow_service.list_followers(db, user_id, limit, offset),
    }


@router.get('/users/{user_id}/following')
def get_following(
    user_id: str,
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    """Public list of users that `user_id` follows. Mirror of
    /followers."""
    limit = min(max(limit, 1), 200)
    return {
        'user_id': user_id,
        'following': follow_service.list_following(db, user_id, limit, offset),
    }


# ==================== Collections ====================
#
# Private per-user reading lists of knowledge articles. The CRUD
# endpoints are auth-required; the detail endpoint enforces ownership
# inside the service (cross-user reads collapse to 404).
#
# Why auth-required (not optional)? Collections are private — a
# guest has no way to attach a user_id. There's no "view another
# user's collection" use case in the current UX.


@router.get('/collections')
def list_my_collections(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
):
    """List the current user's collections, newest first, with item
    counts denormalized so the FE can render badges without a second
    round-trip per row."""
    limit = min(max(limit, 1), 200)
    items = collections_service.list_collections(
        db, current_user['user_id'], limit, offset,
    )
    return {'items': items}


@router.post('/collections')
def create_collection(
    request: CollectionCreateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new collection. Empty name or oversized name surfaces
    as 400 via ValueError; everything else falls through to a 201 with
    the new row."""
    try:
        return collections_service.create_collection(
            db, current_user['user_id'],
            name=request.name,
            description=request.description,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get('/collections/{collection_id}')
def get_collection_detail(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Returns the collection plus its items (knowledge title +
    category). 404 covers both not-found and not-yours — we don't
    leak existence."""
    try:
        return collections_service.get_collection(
            db, collection_id, current_user['user_id'],
        )
    except collections_service.CollectionNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch('/collections/{collection_id}')
def update_collection(
    collection_id: int,
    request: CollectionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        return collections_service.update_collection(
            db, collection_id, current_user['user_id'],
            name=request.name,
            description=request.description,
        )
    except collections_service.CollectionNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete('/collections/{collection_id}')
def delete_collection(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        collections_service.delete_collection(
            db, collection_id, current_user['user_id'],
        )
    except collections_service.CollectionNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {'deleted': True}


@router.post('/collections/{collection_id}/items')
def add_collection_item(
    collection_id: int,
    request: CollectionItemRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Add an article to a collection. Idempotent: re-adding returns
    the same 201 with the new item_count. 400 covers unsupported
    content_type; 404 covers unknown article / not-your-collection."""
    try:
        added = collections_service.add_item(
            db, collection_id, current_user['user_id'],
            request.content_type, request.content_id,
        )
    except collections_service.CollectionNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except collections_service.ArticleNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # Re-fetch item count for the response — saves the FE a second
    # GET and keeps the payload stable.
    return {
        'added': added,
        'collection_id': collection_id,
    }


@router.delete('/collections/{collection_id}/items')
def remove_collection_item(
    collection_id: int,
    request: CollectionItemRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        collections_service.remove_item(
            db, collection_id, current_user['user_id'],
            request.content_type, request.content_id,
        )
    except collections_service.CollectionNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {'removed': True}


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
def login(request: LoginRequest, response: Response):
    user = verify_user_credentials(request.username_or_email, request.password)
    if not user:
        logger.warning(f"Failed password login attempt for: {request.username_or_email}")
        raise HTTPException(status_code=401, detail='Tài khoản hoặc mật khẩu không chính xác')

    # Tạo JWT token mã hóa user_id và role, set vào httpOnly cookie.
    # Token KHÔNG còn trong response body — FE không cần biết nó là gì.
    token = create_access_token(data={"user_id": user.user_id, "role": user.role})
    _set_auth_cookie(response, token)
    logger.info(f"User logged in successfully via password: {user.user_id} (Role: {user.role})")
    return {
        'status': 'success',
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
def login_face(request: FaceLoginRequest, response: Response):
    try:
        result = recognize_face(request.image_base64)
        if result['status'] == 'success':
            user_id = result['data']['user_id']
            user = get_user_by_user_id(user_id)
            if user:
                token = create_access_token(data={"user_id": user.user_id, "role": user.role})
                _set_auth_cookie(response, token)
                logger.info(f"User logged in successfully via Face ID: {user.user_id} (Confidence: {result['data'].get('confidence', 'N/A')})")
                return {
                    'status': 'success',
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


@router.post('/auth/logout')
def logout(response: Response):
    """Clear the auth cookie. Idempotent — calling when there's no
    cookie still returns 200. No auth required: a user with an
    expired/garbage cookie should be able to log out cleanly."""
    _clear_auth_cookie(response)
    return {'status': 'success'}


@router.get('/auth/me')
def me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the current user. Used by the FE on page reload to
    rebuild the user state without keeping it in localStorage.

    Replaces the old FE pattern of reading 'user' from localStorage —
    localStorage was the second half of the XSS-stealable credential
    pair (token + user object), and the cookie makes both moot."""
    user = get_user_by_user_id(current_user['user_id'])
    if not user:
        raise HTTPException(status_code=404, detail='user not found')
    return {
        'user_id': user.user_id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'registered_images': user.registered_images,
        'avatar_url': get_user_avatar_url(user.user_id),
    }


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
def create_game(
    request: GameCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new game post — requires sign-in. Bare auth check for now;
    the Game model lacks a user_id column so we can't track authorship yet
    (Phase 2 follow-up). The endpoint is gated so anonymous spam can't
    happen while the schema lacks an owner field."""
    return games_service.create_game(
        db,
        title=request.title,
        category=request.category,
        description=request.description,
        content=request.content,
        image_url=request.image_url
    )

@router.post('/games/{game_id}/view')
def view_game(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_optional_user),
):
    """Increment game post views. If the caller is signed in, also
    record a per-user activity event for the Personal Dashboard
    (silent failure: a broken event log must not break the like/view
    flow that the rest of the app depends on)."""
    game = games_service.update_game_views(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail='Game post not found')
    if current_user:
        try:
            dashboard_service.record_event(
                db, current_user['user_id'], 'game', game_id, 'view',
            )
        except Exception as ev_err:
            logger.warning(f'Failed to record game view event: {ev_err}')
    return {'message': 'View count updated', 'views': game.views}

@router.post('/games/{game_id}/like')
def like_game(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_optional_user),
):
    """Increment game post likes + record per-user event when signed in."""
    game = games_service.update_game_likes(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail='Game post not found')
    if current_user:
        try:
            dashboard_service.record_event(
                db, current_user['user_id'], 'game', game_id, 'like',
            )
        except Exception as ev_err:
            logger.warning(f'Failed to record game like event: {ev_err}')
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
def add_song_to_playlist(
    playlist_id: int,
    song_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a song to a playlist — requires sign-in so users can't enqueue
    their own songs into other people's playlists. Ownership-based
    restriction (only the playlist owner can add songs) is a Phase 2
    follow-up since Playlist has no user_id column yet."""
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
def play_song(
    song_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_optional_user),
):
    """Increment song plays + record per-user event when signed in."""
    song = music_service.update_song_plays(db, song_id)
    if not song:
        raise HTTPException(status_code=404, detail='Song not found')
    if current_user:
        try:
            dashboard_service.record_event(
                db, current_user['user_id'], 'music', song_id, 'play',
            )
        except Exception as ev_err:
            logger.warning(f'Failed to record music play event: {ev_err}')
    return {'message': 'Play count updated', 'plays': song.plays}

@router.post('/music/{song_id}/like')
def like_song(
    song_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_optional_user),
):
    """Increment song likes + record per-user event when signed in."""
    song = music_service.update_song_likes(db, song_id)
    if not song:
        raise HTTPException(status_code=404, detail='Song not found')
    if current_user:
        try:
            dashboard_service.record_event(
                db, current_user['user_id'], 'music', song_id, 'like',
            )
        except Exception as ev_err:
            logger.warning(f'Failed to record music like event: {ev_err}')
    return {'message': 'Like count updated', 'likes': song.likes}


# ==================== Knowledge Endpoints ====================

def _enrich_knowledge(article, db: Session) -> dict:
    """Build a JSON-friendly dict for one Knowledge row. Adds the
    article's tags so the FE can render tag chips without a second
    round-trip. We avoid the Pydantic response_model here because
    adding `tags` to KnowledgeResponse would force every caller
    (including internal services) to compute the tag list — the
    denormalization is only relevant to the public-facing routes."""
    return {
        'id': article.id,
        'title': article.title,
        'category': article.category,
        'description': article.description,
        'content': article.content,
        'author': article.author,
        'author_user_id': article.author_user_id,
        'views': article.views,
        'likes': article.likes,
        'created_at': article.created_at.isoformat() if article.created_at else None,
        'tags': tags_service.tags_for_content(db, 'knowledge', article.id),
    }


def _enrich_post(post, db: Session) -> dict:
    return {
        'id': post.id,
        'user_id': post.user_id,
        'post_type': post.post_type,
        'title': post.title,
        'description': post.description,
        'media_url': post.media_url,
        'thumbnail': post.thumbnail,
        'status': post.status,
        'created_at': post.created_at.isoformat() if post.created_at else None,
        'tags': tags_service.tags_for_content(db, 'post', post.id),
    }


def _parse_tags_param(raw: str | None) -> list[str]:
    """Comma-separated tag list from a query string. Empty / missing
    returns []. We don't validate each tag here — the filter service
    silently drops unknowns (filter_content_ids only returns ids that
    match known tag names)."""
    if not raw:
        return []
    return [t for t in raw.split(',') if t.strip()]


@router.get('/knowledge', response_model=None)
def get_all_knowledge(
    tags: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List articles. Optional `?tags=a,b,c` filters by tag (OR match)
    — same UX as the category chip filter. Returns dict rows (not
    Pydantic) so we can include the tags array inline."""
    knowledge_service.init_articles(db)
    rows = knowledge_service.get_all_articles(db, limit=limit)
    tag_names = _parse_tags_param(tags)
    if tag_names:
        matching_ids = tags_service.filter_content_ids(db, 'knowledge', tag_names)
        rows = [r for r in rows if r.id in matching_ids]
    return [_enrich_knowledge(r, db) for r in rows]

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
@router.get('/knowledge/{article_id}/videos', response_model=VideoListResponse)
def get_article_videos(article_id: int, db: Session = Depends(get_db)):
    """Return up to 3 YouTube videos related to an article. The search query
    is built from the article's title + category inside the service layer.
    Returns an empty list (not 404) if the API key is missing or upstream
    fails — the FE renders a graceful empty state instead of an error."""
    article = knowledge_service.get_article_by_id(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail='Article not found')
    videos = knowledge_service.search_youtube_videos(article, max_results=3)
    return {'videos': videos}

@router.get('/knowledge/{article_id}', response_model=None)
def get_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_optional_user),
):
    """Get article by ID and increment views. If signed in, the
    view also counts as a per-user activity event for the dashboard."""
    user_id = current_user['user_id'] if current_user else None
    article = knowledge_service.get_article_by_id(db, article_id, user_id=user_id)
    if not article:
        raise HTTPException(status_code=404, detail='Article not found')
    return _enrich_knowledge(article, db)

@router.post('/knowledge', response_model=None, status_code=201)
def create_article(
    request: KnowledgeCreateRequest,
    tags: list[str] | None = None,  # accepted as form/JSON body field
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new article — requires sign-in. The Knowledge model
    already has an `author` field which we set from current_user so we at
    least know who wrote the piece, even without a user_id FK column.

    Tier 3 L: accepts an optional `tags` array (list of tag names).
    Names are normalized + deduped server-side; unknown names
    auto-create new Tag rows. We don't fail the create if a tag is
    bogus — the route treats `tags` as best-effort metadata."""
    article = knowledge_service.create_article(
        db,
        title=request.title,
        category=request.category,
        description=request.description,
        content=request.content,
        author=current_user.get('user_id') or request.author
    )
    if tags:
        try:
            tags_service.attach(db, 'knowledge', article.id, tags)
        except ValueError:
            # Drop the over-long tag silently — the article still
            # gets created, the user can re-tag from the detail page.
            pass
    return _enrich_knowledge(article, db)

@router.post('/knowledge/{article_id}/like')
def like_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_optional_user),
):
    """Increment article likes + record per-user event when signed in."""
    article = knowledge_service.update_article_likes(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail='Article not found')
    if current_user:
        try:
            dashboard_service.record_event(
                db, current_user['user_id'], 'knowledge', article_id, 'like',
            )
        except Exception as ev_err:
            logger.warning(f'Failed to record article like event: {ev_err}')
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


@router.delete('/posts/upload')
def delete_post_file(
    url: str,
    current_user: dict = Depends(get_current_user)
):
    """Best-effort orphan cleanup for files uploaded via POST /posts/upload.

    Called by the FE when an upload succeeded but the subsequent create_post
    request failed — without this, those files would sit in static/uploads
    forever. Returns 200 even if the URL was unknown or already gone (the
    FE swallows the call anyway); 4xx only if the URL is suspicious.
    """
    # Guard rails — anything we can't identify as a static uploads URL
    # should be rejected explicitly so a misuse shows up in logs.
    if not url or not url.startswith('/static/uploads/'):
        raise HTTPException(
            status_code=400,
            detail='Chỉ chấp nhận URL dạng /static/uploads/...'
        )
    deleted = posts_service.delete_uploaded_file(url)
    return {'deleted': deleted}


@router.post('/posts', response_model=None, status_code=201)
def create_post(
    request: PostCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        post = posts_service.create_post(db, request, current_user.get("user_id"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo bài đăng: {str(e)}")
    # Tier 3 L: optional tag attach on create. Best-effort — the
    # post is committed even if a tag name is bogus (the service
    # silently drops invalid names).
    if request.tags:
        try:
            tags_service.attach(db, 'post', post.id, request.tags)
        except ValueError:
            pass
    return _enrich_post(post, db)


@router.get('/posts', response_model=None)
def get_posts(
    tags: str | None = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        rows = posts_service.get_posts(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách bài đăng: {str(e)}")
    tag_names = _parse_tags_param(tags)
    if tag_names:
        matching_ids = tags_service.filter_content_ids(db, 'post', tag_names)
        rows = [r for r in rows if r.id in matching_ids]
    return [_enrich_post(r, db) for r in rows]


# ==================== Tag Endpoints (Tier 3 L) ====================
#
# Global tag vocabulary + per-content attach/detach. The autocomplete
# endpoint is open to anyone (signed or not) so the FE can show
# suggestions as the user types; mutations are auth-required.

@router.get('/tags')
def list_tags(
    q: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Autocomplete for the tag input. Pass `?q=mach` to get tags
    starting with 'mach' (case-insensitive substring), ranked by
    usage count. Limit defaults to 20 — the FE's dropdown caps at
    10 visible rows."""
    if not q:
        return {'items': []}
    return {'items': tags_service.search_tags(db, q, limit)}


@router.post('/tags/attach')
def attach_tags(
    content_type: str,
    content_id: int,
    request: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Attach a set of tag names to a piece of content. Body shape:
    `{content_type, content_id, names: [...]}`. The route re-reads
    `content_type` and `content_id` from query string for ergonomic
    reasons — the FE's batch tagger can issue many POSTs without
    repeating the same data in each body.

    Idempotent: re-attaching is a no-op. Returns the new tag list
    attached to the content so the FE can re-render the chip strip
    without a follow-up GET."""
    if content_type not in {'knowledge', 'post'}:
        raise HTTPException(status_code=400, detail='unsupported content_type')
    names = (request or {}).get('names') or []
    if not isinstance(names, list):
        raise HTTPException(status_code=400, detail='names must be a list')
    try:
        tags_service.attach(db, content_type, content_id, names)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {'tags': tags_service.tags_for_content(db, content_type, content_id)}


@router.post('/tags/detach')
def detach_tag(
    content_type: str,
    content_id: int,
    name: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a single tag from a piece of content by name. Idempotent."""
    if content_type not in {'knowledge', 'post'}:
        raise HTTPException(status_code=400, detail='unsupported content_type')
    tags_service.detach(db, content_type, content_id, name)
    return {'tags': tags_service.tags_for_content(db, content_type, content_id)}


# ==================== Personal Dashboard Endpoints ====================

class ActivityTrackRequest(BaseModel):
    """Body for POST /activity/track — explicit Pydantic model (instead
    of a dict) so a missing field returns a useful 422 instead of a
    TypeError deep inside dashboard_service."""
    content_type: str
    content_id: int
    event_type: str


@router.post('/activity/track')
def track_activity(
    request: ActivityTrackRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a per-user content event for the Personal Dashboard.

    Distinct from the global view/like/play counters: those are
    anonymous totals on the content table; this is the signed-in
    user's per-event log. The two are written in parallel from the
    view/like/play routes; this endpoint exists for events that
    don't have a natural counter bump (e.g. opening a Knowledge
    article from a deep-link that bypasses GET /knowledge/{id}).
    """
    if request.content_type not in {'knowledge', 'music', 'game', 'post'}:
        raise HTTPException(
            status_code=400,
            detail=f'content_type không hợp lệ: {request.content_type!r}',
        )
    if request.event_type not in {'view', 'play', 'like'}:
        raise HTTPException(
            status_code=400,
            detail=f'event_type không hợp lệ: {request.event_type!r}',
        )
    result = dashboard_service.record_event(
        db, current_user['user_id'],
        request.content_type, request.content_id, request.event_type,
    )
    return result


@router.get('/me/insights')
def get_my_insights(
    days: int = 7,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregated activity stats for the Personal Dashboard. Returns
    a dict with stable keys (zeros + empty lists for new users) so
    the FE never has to handle 404 on the empty state."""
    return dashboard_service.get_user_insights(db, current_user['user_id'], days=days)


@router.get('/me/insights/export')
def export_my_insights(
    days: int = 7,
    fmt: str = 'csv',
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download the dashboard insights as JSON or CSV. The response
    uses Content-Disposition: attachment so the browser pops a save
    dialog. Content-Type is set per-format."""
    fmt = (fmt or '').lower()
    if fmt not in ('csv', 'json'):
        raise HTTPException(status_code=400, detail="fmt must be 'csv' or 'json'")
    body, content_type, filename = dashboard_service.export_insights(
        db, current_user['user_id'], days=days, fmt=fmt,
    )
    return Response(
        content=body,
        media_type=content_type,
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


@router.get('/me/recent-activity')
def get_my_recent_activity(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Most recent per-user activity events joined with a tiny title
    + cover payload so the FE can render the list without a second
    round of GETs."""
    return dashboard_service.get_recent_activity(db, current_user['user_id'], limit=limit)


# ==================== Global Search Endpoint ====================

@router.get('/search')
def global_search(
    q: str = '',
    types: str = 'knowledge,music,game',
    limit: int = 5,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cross-content search for the navbar SearchBar.

    `types` is a comma-separated list (e.g. "knowledge,music"). The
    route layer parses the string and hands the list to the service —
    keeping the wire format simple and human-debuggable.

    The `user` type is only included when the caller is admin; the
    service filters it out for non-admins so a non-admin can't even
    see whether the user type would have returned anything (it just
    isn't in the response).
    """
    types_list = [t.strip() for t in types.split(',') if t.strip()]
    is_admin = current_user.get('role') == 'admin'
    return search_service.global_search(
        db, query=q, types=types_list, limit_per_type=limit, is_admin=is_admin,
    )


# ==================== Comments + Reactions ====================
#
# Both endpoints are scoped to a (content_type, content_id) pair so
# the same route serves Knowledge articles and Feed posts. Validation
# lives in the service (comments_service.ALLOWED_CONTENT_TYPES,
# ALLOWED_EMOJIS) — these routes translate exceptions into HTTP codes.

@router.get('/comments')
def list_comments(
    content_type: str,
    content_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the comment thread for a (content_type, content_id) target.
    Public read — login is required (so we can include 'my' info later),
    but anyone can see anyone else's comments."""
    try:
        return comments_service.list_comments(db, content_type, content_id, limit=limit, offset=offset)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post('/comments', status_code=201)
def create_comment(
    payload: CommentCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a comment or reply. The route enforces auth; the service
    enforces content_type / body length / parent thread consistency."""
    try:
        return comments_service.create_comment(
            db,
            user_id=current_user['user_id'],
            content_type=payload.content_type,
            content_id=payload.content_id,
            body=payload.body,
            parent_id=payload.parent_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete('/comments/{comment_id}')
def delete_comment(
    comment_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a comment. Owner OR admin only — service raises
    PermissionError otherwise."""
    is_admin = current_user.get('role') == 'admin'
    try:
        comments_service.delete_comment(
            db, comment_id=comment_id,
            user_id=current_user['user_id'], is_admin=is_admin,
        )
        return {'deleted': True}
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.patch('/comments/{comment_id}')
def update_comment(
    comment_id: int,
    payload: CommentUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit a comment's body. Owner-only. Returns the serialized
    comment so the FE can replace the optimistic row in one round-trip
    instead of refetching the whole thread."""
    try:
        return comments_service.update_comment(
            db, comment_id=comment_id,
            user_id=current_user['user_id'], body=payload.body,
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get('/reactions', response_model=ReactionSummary)
def get_reactions(
    content_type: str,
    content_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return per-emoji counts and the caller's current emoji. The
    `my_emoji` field powers the highlight on the FE's emoji bar."""
    try:
        return comments_service.list_reactions(
            db, content_type, content_id, user_id=current_user['user_id'],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post('/reactions', response_model=ReactionSummary)
def set_reaction(
    payload: ReactionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle or change the caller's reaction. Same emoji → toggle off;
    different emoji → swap. Returns the updated summary so the FE
    doesn't have to re-fetch."""
    try:
        return comments_service.set_reaction(
            db,
            user_id=current_user['user_id'],
            content_type=payload.content_type,
            content_id=payload.content_id,
            emoji=payload.emoji,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ==================== Notifications ====================
#
# The bell badge polls GET /notifications/unread-count every 30s.
# When the user clicks the bell, the FE fetches the full list and
# the same unread_count to sync the badge. mark-as-read is
# idempotent (re-marking a read row returns 200) so retries are safe.

@router.get('/notifications', response_model=NotificationList)
def list_notifications(
    unread_only: bool = False,
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return notification_service.list_notifications(
        db, user_id=current_user['user_id'],
        unread_only=unread_only, limit=limit, offset=offset,
    )


@router.get('/notifications/unread-count', response_model=UnreadCount)
def unread_count(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cheap count endpoint for the FE's 30s polling. Returning just
    an integer keeps the payload tiny — the FE only needs to know
    whether to show / update the badge."""
    return {'count': notification_service.get_unread_count(db, current_user['user_id'])}


@router.post('/notifications/{notification_id}/read')
def mark_notification_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark one notification read. Returns 404 if the notification
    doesn't belong to the caller — we deliberately use 404 (not 403)
    so we don't leak the existence of other users' rows."""
    ok = notification_service.mark_as_read(db, notification_id, current_user['user_id'])
    if not ok:
        raise HTTPException(status_code=404, detail='notification not found')
    return {'read': True}


@router.post('/notifications/read-all')
def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark every unread notification as read. Returns the count of
    rows updated so the FE can clear the badge immediately without
    re-fetching."""
    count = notification_service.mark_all_as_read(db, current_user['user_id'])
    return {'updated': count}


# ==================== Bookmarks ====================

@router.post('/bookmarks/toggle')
def toggle_bookmark(
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle the bookmark for (content_type, content_id) on the
    current user. Returns the new state. Optimistic-update friendly:
    the FE flips its 🔖 icon based on the response and doesn't need a
    second round-trip to verify."""
    content_type = payload.get('content_type')
    content_id = payload.get('content_id')
    if not content_type or content_id is None:
        raise HTTPException(status_code=400, detail='content_type and content_id required')
    try:
        return bookmarks_service.toggle_bookmark(
            db,
            user_id=current_user['user_id'],
            content_type=content_type,
            content_id=int(content_id),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get('/bookmarks')
def list_bookmarks(
    content_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the user's bookmarks with denormalized title/snippet for
    each entry. Optional `content_type` filter restricts to one type.
    """
    try:
        return bookmarks_service.list_bookmarks(
            db,
            user_id=current_user['user_id'],
            content_type=content_type,
            limit=min(limit, 200),
            offset=offset,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get('/bookmarks/ids')
def list_bookmark_ids(
    content_type: str | None = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lightweight (content_type, content_id) tuple list for the FE to
    know which items to render in bookmarked state. Called once on app
    mount; subsequent toggles refresh this in-memory set."""
    try:
        return {
            'items': bookmarks_service.list_bookmark_ids(
                db,
                user_id=current_user['user_id'],
                content_type=content_type,
            )
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete('/bookmarks')
def remove_bookmark(
    content_type: str,
    content_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Idempotent removal — silently no-ops if the bookmark didn't
    exist, so a double-click on the FE side can't surface a 404."""
    try:
        bookmarks_service.remove_bookmark(
            db,
            user_id=current_user['user_id'],
            content_type=content_type,
            content_id=content_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {'deleted': True}
