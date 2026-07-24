import io
import os
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from facenet_pytorch import InceptionResnetV1, MTCNN

try:
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
except ImportError:
    INSIGHTFACE_AVAILABLE = False

ROOT_DIR = Path(__file__).resolve().parents[2]
EMBED_DIR = ROOT_DIR / 'data' / 'embeddings'
EMBED_DIR.mkdir(parents=True, exist_ok=True)

BACKEND = os.environ.get('FACE_RECOGNIZER', 'facenet').lower()
USE_INSIGHTFACE = BACKEND == 'insightface' and INSIGHTFACE_AVAILABLE

if USE_INSIGHTFACE:
    device_id = 0 if torch.cuda.is_available() else -1
    face_app = FaceAnalysis(allowed_modules=['detection', 'recognition'])
    face_app.prepare(ctx_id=device_id, det_size=(640, 640))
else:
    mtcnn = MTCNN(image_size=160, margin=0, keep_all=False, device='cuda' if torch.cuda.is_available() else 'cpu')
    resnet = InceptionResnetV1(pretrained='vggface2').eval().to('cuda' if torch.cuda.is_available() else 'cpu')


def _load_image(image_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(image_bytes)).convert('RGB')


def _extract_face(image_bytes: bytes):
    image = _load_image(image_bytes)
    if USE_INSIGHTFACE:
        image_np = np.asarray(image)
        results = face_app.get(image_np)
        if not results:
            return None
        return results[0]

    face = mtcnn(image)
    if face is None:
        return None
    return face.unsqueeze(0)


def embed_face(image_bytes: bytes):
    if USE_INSIGHTFACE:
        face = _extract_face(image_bytes)
        if face is None:
            return None
        return face.embedding.astype(np.float32)

    face_tensor = _extract_face(image_bytes)
    if face_tensor is None:
        return None
    device = next(resnet.parameters()).device
    face_tensor = face_tensor.to(device)
    with torch.no_grad():
        embedding = resnet(face_tensor)
    return embedding[0].cpu().numpy()


# Global RAM Cache for face embeddings to speed up recognition
_embeddings_cache = {}


def load_embeddings_into_cache():
    """
    Loads all .npy face embeddings from the local EMBED_DIR into the RAM cache.
    """
    global _embeddings_cache
    _embeddings_cache.clear()
    count = 0
    for path in EMBED_DIR.glob('*.npy'):
        try:
            _embeddings_cache[path.stem] = np.load(path)
            count += 1
        except Exception as e:
            print(f"[recognizer] Error caching embedding for {path.name}: {e}")
    print(f"[recognizer] Successfully cached {count} face embeddings in RAM.")


def save_user_embedding(user_id: str, embeddings):
    if not embeddings:
        return None
    stacked = np.stack(embeddings, axis=0)
    avg_embedding = stacked.mean(axis=0)
    path = EMBED_DIR / f'{user_id}.npy'
    np.save(path, avg_embedding)
    
    # Update RAM Cache immediately
    _embeddings_cache[user_id] = avg_embedding
    
    return str(path)


def load_user_embedding(user_id: str):
    # Try cache first
    if user_id in _embeddings_cache:
        return _embeddings_cache[user_id]
        
    # Fallback to disk
    path = EMBED_DIR / f'{user_id}.npy'
    if not path.exists():
        return None
    try:
        emb = np.load(path)
        _embeddings_cache[user_id] = emb
        return emb
    except Exception:
        return None


def list_user_embeddings():
    # If cache is empty, load it once
    if not _embeddings_cache:
        load_embeddings_into_cache()
    return list(_embeddings_cache.items())


def cosine_similarity(query, candidate):
    numerator = np.dot(query, candidate)
    denominator = np.linalg.norm(query) * np.linalg.norm(candidate)
    if denominator == 0:
        return 0.0
    return float(numerator / denominator)


def recognize_embedding(query_embedding, threshold: float = 0.75):
    known = list_user_embeddings()
    if not known:
        return None
    scores = [(user_id, cosine_similarity(query_embedding, emb)) for user_id, emb in known]
    best_user_id, best_score = max(scores, key=lambda item: item[1])
    if best_score < threshold:
        return None
    return {'user_id': best_user_id, 'score': best_score}

