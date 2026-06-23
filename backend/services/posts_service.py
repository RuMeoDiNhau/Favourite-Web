import os
import zipfile
import io
import shutil
import uuid
from pathlib import Path
from sqlalchemy.orm import Session
from backend.services.db_models import Post
from backend.services.schemas import PostCreateRequest
from backend.services.s3_service import s3_client, AWS_STORAGE_BUCKET_NAME, upload_file_to_s3

BASE_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = BASE_DIR / 'static'
STATIC_UPLOADS_DIR = STATIC_DIR / 'uploads'
STATIC_GAMES_DIR = STATIC_DIR / 'games'

def get_posts(db: Session, limit: int = 100):
    """
    Retrieve posts from database sorted by created_at descending.
    """
    return db.query(Post).order_by(Post.created_at.desc()).limit(limit).all()

def create_post(db: Session, post_data: PostCreateRequest, user_id: str) -> Post:
    """
    Create a new post. If the post is a game and contains a zip file path,
    extract it and update the media_url to the index.html location.
    """
    post = Post(
        user_id=user_id,
        post_type=post_data.post_type,
        title=post_data.title,
        description=post_data.description,
        media_url=post_data.media_url,
        thumbnail=post_data.thumbnail,
        status=post_data.status or 'public'
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # Check if this is a game zip that needs extraction
    if post.post_type == 'game' and post.media_url and post.media_url.startswith('/static/uploads/game/') and post.media_url.endswith('.zip'):
        # Local relative path of zip file
        zip_rel_path = post.media_url.lstrip('/')
        zip_abs_path = BASE_DIR / zip_rel_path
        
        if zip_abs_path.exists():
            try:
                # Target extraction folder
                dest_dir = STATIC_GAMES_DIR / str(post.id)
                if dest_dir.exists():
                    shutil.rmtree(dest_dir)
                dest_dir.mkdir(parents=True, exist_ok=True)
                
                # Extract zip file
                with zipfile.ZipFile(zip_abs_path, 'r') as zip_ref:
                    zip_ref.extractall(dest_dir)
                
                # Find index.html or another html file recursively
                index_path = None
                for root, dirs, files in os.walk(dest_dir):
                    if 'index.html' in files:
                        index_path = Path(root) / 'index.html'
                        break
                
                if not index_path:
                    for root, dirs, files in os.walk(dest_dir):
                        html_files = [f for f in files if f.endswith('.html')]
                        if html_files:
                            index_path = Path(root) / html_files[0]
                            break
                
                if index_path:
                    # Get relative path to STATIC_DIR
                    rel_to_static = index_path.relative_to(STATIC_DIR)
                    post.media_url = f"/static/{rel_to_static.as_posix()}"
                else:
                    post.media_url = f"/static/games/{post.id}/index.html"
                
                db.commit()
                db.refresh(post)
                
                # Clean up the original zip file
                try:
                    os.remove(zip_abs_path)
                except Exception as clean_err:
                    print(f"Error cleaning up zip file: {clean_err}")
                    
            except Exception as extract_err:
                print(f"Error extracting game zip: {extract_err}")
                
    return post

def upload_media_file(file_bytes: bytes, filename: str, post_type: str) -> str:
    """
    Upload a media file (image, video, audio, zip).
    Supports S3 upload if configured (except for zip files, which are unzipped locally),
    with local directory fallback.
    """
    subfolder = post_type
    ext = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"
    
    # Game zip archives MUST be processed locally, so we skip S3 upload for game zips
    # Other assets can go to S3 if configured
    if post_type != 'game' and s3_client and AWS_STORAGE_BUCKET_NAME:
        try:
            content_type = "application/octet-stream"
            ext_lower = ext.lower()
            if ext_lower in ['.jpg', '.jpeg']:
                content_type = "image/jpeg"
            elif ext_lower == '.png':
                content_type = "image/png"
            elif ext_lower == '.gif':
                content_type = "image/gif"
            elif ext_lower == '.mp4':
                content_type = "video/mp4"
            elif ext_lower == '.mp3':
                content_type = "audio/mpeg"
            elif ext_lower == '.wav':
                content_type = "audio/wav"
                
            s3_key = f"uploads/{post_type}/{unique_filename}"
            s3_url = upload_file_to_s3(file_bytes, s3_key, content_type)
            return s3_url
        except Exception as s3_err:
            print(f"S3 upload failed: {s3_err}. Falling back to local storage.")
            
    # Save locally
    dest_dir = STATIC_UPLOADS_DIR / subfolder
    dest_dir.mkdir(parents=True, exist_ok=True)
    file_path = dest_dir / unique_filename
    
    with open(file_path, "wb") as f:
        f.write(file_bytes)
        
    return f"/static/uploads/{subfolder}/{unique_filename}"
