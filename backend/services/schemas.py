from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class RecognizeRequest(BaseModel):
    image_base64: str

class EnrollmentRequest(BaseModel):
    user_id: str
    name: str
    department: Optional[str] = None
    images_base64: List[str]


# Game Schemas
class GameResponse(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str]
    image_url: Optional[str]
    plays: int
    likes: int
    created_at: datetime

    class Config:
        from_attributes = True


class GameCreateRequest(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    image_url: Optional[str] = None


# Music Schemas
class PlaylistResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    song_count: int
    image_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class MusicResponse(BaseModel):
    id: int
    title: str
    artist: str
    duration: str
    genre: str
    playlist_id: Optional[int]
    plays: int
    likes: int
    created_at: datetime

    class Config:
        from_attributes = True


class MusicCreateRequest(BaseModel):
    title: str
    artist: str
    duration: str
    genre: str
    playlist_id: Optional[int] = None


# Knowledge Schemas
class KnowledgeResponse(BaseModel):
    id: int
    title: str
    category: str
    description: str
    content: Optional[str]
    author: str
    views: int
    likes: int
    created_at: datetime

    class Config:
        from_attributes = True


class KnowledgeCreateRequest(BaseModel):
    title: str
    category: str
    description: str
    content: Optional[str] = None
    author: str
