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
    # Tier 3 L: optional tags to attach on creation. Server normalizes
    # + dedupes; unknown names auto-create. Empty list / None = no
    # tags. We don't validate length here — the service rejects
    # over-100-char names with a 400.
    tags: Optional[List[str]] = None


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
    # Tier 3 L: optional tags to attach on creation. Same semantics
    # as KnowledgeCreateRequest.tags — normalized + deduped, unknown
    # names auto-create.
    tags: Optional[List[str]] = None
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


# Comments + Reactions — both are scoped to a content_type ('knowledge'
# or 'post'). The FE chooses the type based on where the CommentSection
# is mounted. Keeping them as polymorphic tables (vs. one table per
# content type) avoids duplicating the same schema 4 times.

class CommentCreateRequest(BaseModel):
    content_type: str     # 'knowledge' | 'post'
    content_id: int
    body: str
    parent_id: Optional[int] = None


class CommentUpdateRequest(BaseModel):
    """Body-only update — content_type / content_id / parent are
    immutable after creation. Editing your own comment doesn't move
    it under a different thread or change who can reply to it."""
    body: str


class CommentResponse(BaseModel):
    """One comment node in the thread. Top-level nodes carry their
    replies in `replies`; reply nodes have empty `replies`. The FE
    uses this 1-level structure to render indented replies without
    recursion.

    `updated_at` is None for never-edited comments; the FE shows a
    "đã chỉnh sửa" hint next to the timestamp when it's non-null.
    """
    id: int
    user_id: str
    user_name: Optional[str] = None
    user_avatar_url: Optional[str] = None
    body: str
    parent_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    replies: List['CommentResponse'] = []


class ReactionRequest(BaseModel):
    content_type: str     # 'knowledge' | 'post'
    content_id: int
    emoji: str            # 'like' | 'love' | 'fire' | 'laugh' | 'wow'


class ReactionSummary(BaseModel):
    """Returned by GET /reactions and POST /reactions. `my_emoji` is
    the current user's reaction (or null if none) — this is what the
    FE uses to decide which emoji button to highlight."""
    counts: dict
    my_emoji: Optional[str] = None


# Notifications — the bell badge and dropdown both read from this.
# `unread_count` on the list endpoint lets the FE sync the badge
# alongside the dropdown content in a single roundtrip.

class NotificationResponse(BaseModel):
    id: int
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    type: str
    content_type: Optional[str] = None
    content_id: Optional[int] = None
    message: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationList(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int


class UnreadCount(BaseModel):
    count: int


# Collection Schemas
class CollectionCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None


class CollectionUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class CollectionItemRequest(BaseModel):
    content_type: str
    content_id: int

