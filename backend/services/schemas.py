from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class RecognizeRequest(BaseModel):
    image_base64: str

class EnrollmentRequest(BaseModel):
    user_id: str
    name: str
    email: Optional[str] = None
    password: Optional[str] = None
    department: Optional[str] = None
    images_base64: List[str]


# Game Schemas
class GameResponse(BaseModel):
    id: int
    title: str
    category: str
    description: Optional[str]
    content: Optional[str]
    image_url: Optional[str]
    views: int
    likes: int
    created_at: datetime

    class Config:
        from_attributes = True


class GameCreateRequest(BaseModel):
    title: str
    category: str
    description: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None


# Music Schemas
class PlaylistCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None


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
    file_url: Optional[str]
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
    file_url: Optional[str] = None
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


# Authentication Schemas
class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class FaceLoginRequest(BaseModel):
    image_base64: str


# Post Schemas
class PostResponse(BaseModel):
    id: int
    user_id: str
    post_type: str
    title: str
    description: Optional[str]
    media_url: Optional[str]
    thumbnail: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class PostCreateRequest(BaseModel):
    post_type: str
    title: str
    description: Optional[str] = None
    media_url: Optional[str] = None
    thumbnail: Optional[str] = None
    status: Optional[str] = 'public'


class VideoItem(BaseModel):
    """A single YouTube video reference returned by the /knowledge/{id}/videos
    endpoint. videoId is the YouTube channel id (the part after v= in a watch
    URL) used by https://www.youtube.com/embed/{videoId} for iframe embeds."""
    videoId: str
    title: str
    channel: str


class VideoListResponse(BaseModel):
    """List of related videos for an article. Kept short (3 by default) so the
    modal UI stays compact — FE renders this directly inside the article view."""
    videos: List[VideoItem]

