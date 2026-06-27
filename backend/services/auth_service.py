import os
from datetime import datetime, timedelta
import jwt
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=BASE_DIR / ".env")

# Lấy JWT_SECRET từ .env, nếu không có sẽ lấy giá trị mặc định để tránh lỗi
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """
    Tạo JWT token chứa thông tin payload (ví dụ: user_id, role) và thời gian hết hạn (exp).
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)  # Thời hạn mặc định: 7 ngày
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """
    Giải mã và kiểm tra chữ ký mã hóa JWT token.
    Ném ra ExpiredSignatureError nếu hết hạn, hoặc PyJWTError nếu không hợp lệ.
    """
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
