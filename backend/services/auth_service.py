import os
from datetime import datetime, timedelta
import jwt
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=BASE_DIR / ".env")

# Lấy JWT_SECRET từ .env. Trong production (ENV=production) thì bắt buộc
# phải set, không có fallback — default secret cho phép forge token.
# Trong development cho phép default nhưng in warning mạnh để dev biết.
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
APP_ENV = os.getenv("APP_ENV", "development")

if not os.getenv("JWT_SECRET"):
    if APP_ENV == "production":
        raise RuntimeError(
            "JWT_SECRET must be set in production. "
            "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(64))'"
        )
    else:
        print(
            "[auth_service] WARNING: JWT_SECRET not set. "
            "Using insecure default — DO NOT run in production with this config. "
            "Set JWT_SECRET in .env to silence this warning."
        )

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
