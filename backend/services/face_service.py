import base64
from datetime import datetime
from fastapi import HTTPException
from backend.ai_core.src.recognizer import embed_face, recognize_embedding
from backend.services.db_service import create_log, get_user_by_user_id, save_log_image


def _decode_image(image_base64: str) -> bytes:
    if ',' in image_base64:
        image_base64 = image_base64.split(',', 1)[1]
    try:
        return base64.b64decode(image_base64)
    except Exception:
        raise HTTPException(status_code=400, detail='Base64 image không hợp lệ')


def recognize_face(image_base64: str):
    image_bytes = _decode_image(image_base64)
    filename = save_log_image(image_bytes)
    embedding = embed_face(image_bytes)

    if embedding is None:
        create_log('UNKNOWN', 'Người lạ', 'failed', filename)
        raise HTTPException(status_code=404, detail='Không nhận diện được khuôn mặt hoặc người lạ')

    result = recognize_embedding(embedding)
    if not result:
        create_log('UNKNOWN', 'Người lạ', 'failed', filename)
        raise HTTPException(status_code=404, detail='Không nhận diện được khuôn mặt hoặc người lạ')

    user = get_user_by_user_id(result['user_id'])
    if not user:
        create_log('UNKNOWN', 'Người lạ', 'failed', filename)
        raise HTTPException(status_code=404, detail='Không nhận diện được khuôn mặt hoặc người lạ')

    create_log(user.user_id, user.name, 'success', filename)
    return {
        'status': 'success',
        'message': 'Nhận diện thành công',
        'data': {
            'user_id': user.user_id,
            'name': user.name,
            'confidence_score': round(result['score'], 2),
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        },
    }
