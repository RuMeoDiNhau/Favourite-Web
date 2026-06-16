from sqlalchemy.orm import Session
from backend.services.db_models import Music, Playlist

# Sample music data
SAMPLE_PLAYLISTS = [
    {"name": "Nhạc Yêu Thích", "description": "Những bài hát yêu thích nhất", "song_count": 25, "image_url": "🎵"},
    {"name": "Chill Vibes", "description": "Nhạc thư giãn", "song_count": 18, "image_url": "😌"},
    {"name": "Workout Mix", "description": "Nhạc tập luyện", "song_count": 32, "image_url": "💪"},
    {"name": "Sleep Well", "description": "Nhạc ngủ ngon", "song_count": 14, "image_url": "😴"},
]

SAMPLE_SONGS = [
    {"title": "Moonlight Sonata", "artist": "Classical Symphony", "duration": "3:45", "genre": "Classical", "playlist_id": None, "plays": 450, "likes": 120},
    {"title": "Urban Vibes", "artist": "Modern Beats", "duration": "4:12", "genre": "Electronic", "playlist_id": None, "plays": 320, "likes": 85},
    {"title": "Ocean Waves", "artist": "Nature Sounds", "duration": "5:30", "genre": "Ambient", "playlist_id": None, "plays": 280, "likes": 95},
    {"title": "Midnight Jazz", "artist": "Jazz Legends", "duration": "4:55", "genre": "Jazz", "playlist_id": None, "plays": 210, "likes": 68},
    {"title": "Summer Dreams", "artist": "Pop Stars", "duration": "3:20", "genre": "Pop", "playlist_id": None, "plays": 520, "likes": 145},
    {"title": "Rock Anthem", "artist": "Rock Kings", "duration": "4:30", "genre": "Rock", "playlist_id": None, "plays": 380, "likes": 110},
    {"title": "Hip Hop Flow", "artist": "Rap Masters", "duration": "3:55", "genre": "Hip Hop", "playlist_id": None, "plays": 410, "likes": 125},
    {"title": "Country Road", "artist": "Folk Singers", "duration": "4:15", "genre": "Country", "playlist_id": None, "plays": 190, "likes": 55},
]


def init_playlists_and_music(db: Session):
    """Initialize sample playlists and music if database is empty"""
    existing_playlists = db.query(Playlist).count()
    if existing_playlists == 0:
        for playlist_data in SAMPLE_PLAYLISTS:
            playlist = Playlist(**playlist_data)
            db.add(playlist)
        db.commit()

        for song_data in SAMPLE_SONGS:
            music = Music(**song_data)
            db.add(music)
        db.commit()


def get_all_playlists(db: Session):
    """Get all playlists"""
    return db.query(Playlist).all()


def get_playlist_by_id(db: Session, playlist_id: int):
    """Get playlist by ID"""
    return db.query(Playlist).filter(Playlist.id == playlist_id).first()


def create_playlist(db: Session, name: str, description: str = None, image_url: str = None):
    """Create a new playlist"""
    playlist = Playlist(name=name, description=description, image_url=image_url)
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return playlist


def get_all_songs(db: Session, limit: int = 100):
    """Get all songs"""
    return db.query(Music).limit(limit).all()


def get_songs_by_genre(db: Session, genre: str):
    """Get songs by genre"""
    return db.query(Music).filter(Music.genre == genre).all()


def get_song_by_id(db: Session, song_id: int):
    """Get song by ID"""
    return db.query(Music).filter(Music.id == song_id).first()


def get_songs_by_playlist(db: Session, playlist_id: int):
    """Get songs in a playlist"""
    return db.query(Music).filter(Music.playlist_id == playlist_id).all()


def create_song(db: Session, title: str, artist: str, duration: str, genre: str, playlist_id: int = None):
    """Create a new song"""
    music = Music(title=title, artist=artist, duration=duration, genre=genre, playlist_id=playlist_id)
    db.add(music)
    db.commit()
    db.refresh(music)
    return music


def update_song_plays(db: Session, song_id: int):
    """Increment song plays"""
    music = db.query(Music).filter(Music.id == song_id).first()
    if music:
        music.plays += 1
        db.commit()
        db.refresh(music)
    return music


def update_song_likes(db: Session, song_id: int):
    """Increment song likes"""
    music = db.query(Music).filter(Music.id == song_id).first()
    if music:
        music.likes += 1
        db.commit()
        db.refresh(music)
    return music


def get_popular_songs(db: Session, limit: int = 10):
    """Get most popular songs by likes"""
    return db.query(Music).order_by(Music.likes.desc()).limit(limit).all()


def get_new_songs(db: Session, limit: int = 10):
    """Get newest songs"""
    return db.query(Music).order_by(Music.created_at.desc()).limit(limit).all()
