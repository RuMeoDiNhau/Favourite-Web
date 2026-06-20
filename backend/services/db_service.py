import base64
import math
from datetime import datetime
from pathlib import Path
from sqlalchemy.exc import IntegrityError
from backend.ai_core.src.recognizer import embed_face, save_user_embedding
from backend.services.db_models import SessionLocal, User, Log, init_db, STATIC_LOG_DIR, DATA_RAW_DIR
from backend.services.s3_service import upload_file_to_s3, upload_embedding, s3_client

init_db()


def _get_session():
    return SessionLocal()


def _save_user_images(user_id: str, images_base64):
    saved_files = []

    for idx, raw_data in enumerate(images_base64, start=1):
        if ',' in raw_data:
            raw_data = raw_data.split(',', 1)[1]
        image_bytes = base64.b64decode(raw_data)
        filename = f'{user_id}_{idx:03d}.png'
        
        # Try S3 first
        if s3_client:
            try:
                s3_key = f"raw/{user_id}/{filename}"
                s3_url = upload_file_to_s3(image_bytes, s3_key, content_type="image/png")
                saved_files.append({
                    'path_or_url': s3_url,
                    'bytes': image_bytes,
                    'is_s3': True
                })
                continue
            except Exception:
                # Fallback to local
                pass
                
        # Local fallback
        user_dir = DATA_RAW_DIR / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        filepath = user_dir / filename
        filepath.write_bytes(image_bytes)
        saved_files.append({
            'path_or_url': str(filepath),
            'bytes': image_bytes,
            'is_s3': False
        })

    return saved_files


def create_user(user_id: str, name: str, department: str, images_base64):
    saved_images = _save_user_images(user_id, images_base64)
    embeddings = []

    for img_data in saved_images:
        embedding = embed_face(img_data['bytes'])
        if embedding is not None:
            embeddings.append(embedding)

    if not embeddings:
        return {
            'status': 'error',
            'message': 'Không tìm thấy khuôn mặt hợp lệ trong ảnh đăng ký',
            'data': None,
        }

    saved_path = save_user_embedding(user_id, embeddings)
    
    # Upload embedding to S3 for backup/sync
    if saved_path and s3_client:
        upload_embedding(user_id, Path(saved_path))

    session = _get_session()
    try:
        user = User(
            user_id=user_id,
            name=name,
            department=department,
            registered_images=len(embeddings),
        )
        session.add(user)
        session.commit()
        return {
            'status': 'success',
            'message': 'Đã đăng ký khuôn mặt thành công',
            'data': {
                'user_id': user.user_id,
                'total_embeddings_saved': user.registered_images,
            },
        }
    except IntegrityError:
        session.rollback()
        return {
            'status': 'error',
            'message': 'User ID đã tồn tại',
            'data': None,
        }
    finally:
        session.close()


def get_users(page: int = 1, limit: int = 10):
    session = _get_session()
    try:
        query = session.query(User).order_by(User.created_at.desc())
        total = query.count()
        users = query.offset((page - 1) * limit).limit(limit).all()
        return {
            'status': 'success',
            'data': [
                {
                    'user_id': user.user_id,
                    'name': user.name,
                    'registered_images': user.registered_images,
                    'created_at': user.created_at.isoformat() + 'Z',
                }
                for user in users
            ],
            'pagination': {
                'current_page': page,
                'total_pages': math.ceil(total / limit) if total else 1,
            },
        }
    finally:
        session.close()


def get_user_by_user_id(user_id: str):
    session = _get_session()
    try:
        return session.query(User).filter(User.user_id == user_id).first()
    finally:
        session.close()


def get_logs(limit: int = 50):
    session = _get_session()
    try:
        logs = session.query(Log).order_by(Log.timestamp.desc()).limit(limit).all()
        return {
            'status': 'success',
            'data': [
                {
                    'log_id': log.id,
                    'user_id': log.user_id,
                    'name': log.name,
                    'status': log.status,
                    'timestamp': log.timestamp.isoformat() + 'Z',
                    'captured_image_url': log.captured_image_url,
                }
                for log in logs
            ],
        }
    finally:
        session.close()


def get_first_user():
    session = _get_session()
    try:
        return session.query(User).order_by(User.created_at.asc()).first()
    finally:
        session.close()


def create_log(user_id: str, name: str, status: str, captured_image_url: str):
    session = _get_session()
    try:
        log = Log(
            user_id=user_id,
            name=name,
            status=status,
            captured_image_url=captured_image_url,
            timestamp=datetime.utcnow(),
        )
        session.add(log)
        session.commit()
        return log
    finally:
        session.close()


def save_log_image(image_bytes: bytes) -> str:
    now = datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')
    filename = f'log_{now}.png'
    
    # Try S3 first
    if s3_client:
        try:
            s3_key = f"logs/{filename}"
            s3_url = upload_file_to_s3(image_bytes, s3_key, content_type="image/png")
            return s3_url
        except Exception:
            # Fallback to local
            pass
            
    # Local fallback
    path = STATIC_LOG_DIR / filename
    path.write_bytes(image_bytes)
    return f'/static/logs/{filename}'
