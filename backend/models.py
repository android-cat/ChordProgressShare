"""SQLAlchemyモデル定義

データベーステーブルのORM定義。
- Progression: コード進行本体
- Pattern: コード進行のパターン(複数登録可能)
- Song: 使用楽曲情報
- BlockedIP: ブロックIPリスト
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from database import Base


class Progression(Base):
    """コード進行テーブル
    
    基本情報と承認ステータスを管理。
    編集リクエストの場合はoriginal_idで元の投稿を参照。
    """
    __tablename__ = "progressions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    remarks = Column(Text)
    status = Column(String(20), default="pending")
    normalized_chords = Column(Text)  # 検索用正規化コード
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ip_address = Column(String(45))
    original_id = Column(UUID(as_uuid=True), ForeignKey("progressions.id", ondelete="SET NULL"), nullable=True)

    patterns = relationship("Pattern", back_populates="progression", cascade="all, delete-orphan")
    songs = relationship("Song", back_populates="progression", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'approved', 'rejected')", name="check_status"),
    )


class Pattern(Base):
    """コードパターンテーブル
    
    1つのProgressionに対して複数のパターンを登録可能。
    chords列には16枠分のコード配列をJSONBで格納。
    """
    __tablename__ = "patterns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progression_id = Column(UUID(as_uuid=True), ForeignKey("progressions.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(100), nullable=False)
    chords = Column(JSONB, nullable=False)  # 16枠分の配列
    sort_order = Column(Integer, default=0)

    progression = relationship("Progression", back_populates="patterns")


class Song(Base):
    """使用楽曲テーブル
    
    コード進行が使用されている楽曲情報。
    各種音楽配信サービスのURLを保存。
    """
    __tablename__ = "songs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progression_id = Column(UUID(as_uuid=True), ForeignKey("progressions.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    artist = Column(String(255))
    youtube_url = Column(Text)
    spotify_url = Column(Text)
    apple_music_url = Column(Text)

    progression = relationship("Progression", back_populates="songs")


class BlockedIP(Base):
    """ブロックIPテーブル
    
    スパム対策用。ブロックされたIPからの投稿を拒否。
    """
    __tablename__ = "blocked_ips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ip_address = Column(String(45), nullable=False, unique=True)
    reason = Column(Text)
    blocked_at = Column(DateTime, default=datetime.utcnow)


class Feedback(Base):
    """意見・感想テーブル
    
    ユーザーからのフィードバックを保存。
    """
    __tablename__ = "feedbacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45))
