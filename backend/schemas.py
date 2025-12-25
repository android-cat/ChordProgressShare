"""Pydanticスキーマ定義

APIリクエスト・レスポンスのバリデーションとシリアライズ。
"""

from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# Pattern schemas(コードパターン)
class PatternBase(BaseModel):
    label: str
    chords: List[Optional[str]]  # 16枠分、nullを許容


class PatternCreate(PatternBase):
    pass


class PatternResponse(PatternBase):
    id: UUID
    sort_order: int

    class Config:
        from_attributes = True


# Song schemas
class SongBase(BaseModel):
    name: str
    artist: Optional[str] = None
    youtube_url: Optional[str] = None
    spotify_url: Optional[str] = None
    apple_music_url: Optional[str] = None


class SongCreate(SongBase):
    pass


class SongResponse(SongBase):
    id: UUID

    class Config:
        from_attributes = True


# Progression schemas
class ProgressionBase(BaseModel):
    title: str
    remarks: Optional[str] = None


class ProgressionCreate(ProgressionBase):
    patterns: List[PatternCreate]
    songs: Optional[List[SongCreate]] = []


class ProgressionUpdate(ProgressionBase):
    patterns: List[PatternCreate]
    songs: Optional[List[SongCreate]] = []


class ProgressionResponse(ProgressionBase):
    id: UUID
    status: str
    normalized_chords: Optional[str]
    created_at: datetime
    updated_at: datetime
    patterns: List[PatternResponse]
    songs: List[SongResponse]
    original_id: Optional[UUID] = None
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True


class ProgressionListResponse(BaseModel):
    id: UUID
    title: str
    remarks: Optional[str]
    status: str
    created_at: datetime
    patterns: List[PatternResponse]

    class Config:
        from_attributes = True


# Admin schemas
class AdminAction(BaseModel):
    action: str  # "approve" or "reject"


class BlockIPRequest(BaseModel):
    ip_address: str
    reason: Optional[str] = None


class BlockedIPResponse(BaseModel):
    id: UUID
    ip_address: str
    reason: Optional[str]
    blocked_at: datetime

    class Config:
        from_attributes = True


class DiffResponse(BaseModel):
    original: Optional[ProgressionResponse]
    updated: ProgressionResponse


# Feedback schemas
class FeedbackCreate(BaseModel):
    content: str


class FeedbackResponse(BaseModel):
    id: UUID
    content: str
    created_at: datetime
    ip_address: Optional[str]

    class Config:
        from_attributes = True


class BlockedIPResponse(BaseModel):
    id: UUID
    ip_address: str
    reason: Optional[str]
    blocked_at: datetime

    class Config:
        from_attributes = True


# Search schemas
class SearchQuery(BaseModel):
    query: Optional[str] = None
    chord_query: Optional[str] = None  # 例: "IV|V" や "IIIm|VIm"


# Diff view for admin
class DiffResponse(BaseModel):
    original: Optional[ProgressionResponse]
    updated: ProgressionResponse
