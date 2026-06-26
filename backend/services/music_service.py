import wave
from pathlib import Path
from sqlalchemy.orm import Session
from backend.services.db_models import Music, Playlist

# Sample music data
SAMPLE_PLAYLISTS = [
    {"name": "Nhạc Yêu Thích", "description": "Những bài hát yêu thích nhất", "song_count": 25, "image_url": "🎵"},
    {"name": "Chill Vibes", "description": "Nhạc thư giãn", "song_count": 18, "image_url": "😌"},
    {"name": "Workout Mix", "description": "Nhạc tập luyện", "song_count": 32, "image_url": "💪"},
    {"name": "Sleep Well", "description": "Nhạc ngủ ngon", "song_count": 14, "image_url": "😴"},
]

SAMPLE_SONGS = []


def generate_sample_audio_file():
    """Generates a 3-second silent WAV file locally if it does not exist"""
    try:
        static_music_dir = Path(__file__).resolve().parents[2] / 'static' / 'music'
        static_music_dir.mkdir(parents=True, exist_ok=True)
        sample_path = static_music_dir / 'sample.wav'
        
        if not sample_path.exists():
            # Create a silent mono 16-bit 44.1kHz WAV file (3 seconds)
            with wave.open(str(sample_path), 'wb') as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(44100)
                w.writeframes(b'\x00' * 44100 * 2 * 3)
    except Exception as e:
        print(f"Error generating sample audio: {e}")


def init_playlists_and_music(db: Session):
    """Initialize sample playlists and music if database is empty"""
    generate_sample_audio_file()
    
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


def create_song(db: Session, title: str, artist: str, duration: str, genre: str, file_url: str = None, playlist_id: int = None):
    """Create a new song"""
    music = Music(title=title, artist=artist, duration=duration, genre=genre, file_url=file_url, playlist_id=playlist_id)
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


def delete_song(db: Session, song_id: int) -> bool:
    """Delete a song by ID from database"""
    song = db.query(Music).filter(Music.id == song_id).first()
    if song:
        db.delete(song)
        db.commit()
        return True
    return False


def delete_playlist(db: Session, playlist_id: int) -> bool:
    """Delete a playlist and unset playlist_id for all its songs"""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if playlist:
        # Reset playlist_id for all songs in this playlist
        db.query(Music).filter(Music.playlist_id == playlist_id).update({Music.playlist_id: None})
        db.delete(playlist)
        db.commit()
        return True
    return False


def add_song_to_playlist(db: Session, playlist_id: int, song_id: int) -> bool:
    """Add a song to a playlist and increment playlist song count"""
    song = db.query(Music).filter(Music.id == song_id).first()
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    
    if song and playlist:
        # Decrement song_count of old playlist if it was in one
        if song.playlist_id and song.playlist_id != playlist_id:
            old_playlist = db.query(Playlist).filter(Playlist.id == song.playlist_id).first()
            if old_playlist and old_playlist.song_count > 0:
                old_playlist.song_count -= 1

        song.playlist_id = playlist_id
        db.flush()  # Flush so that count query sees the updated playlist_id
        
        # Refresh song count accurately
        playlist.song_count = db.query(Music).filter(Music.playlist_id == playlist_id).count()
        db.commit()
        return True
    return False


def remove_song_from_playlist(db: Session, song_id: int) -> bool:
    """Remove a song from its current playlist and decrement playlist song count"""
    song = db.query(Music).filter(Music.id == song_id).first()
    if song and song.playlist_id:
        playlist = db.query(Playlist).filter(Playlist.id == song.playlist_id).first()
        song.playlist_id = None
        db.commit()
        
        # Recalculate count
        if playlist:
            playlist.song_count = db.query(Music).filter(Music.playlist_id == playlist.id).count()
            db.commit()
        return True
    return False
