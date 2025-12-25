"""Chord Progress Share API

コード進行共有サイトのバックエンドAPI。
度数(ディグリーネーム)によるコード進行を投稿・共有・検索できるプラットフォーム。

主な機能:
- コード進行のCRUD操作
- 全文検索・コード進行検索
- 管理者による承認フロー
- IPアドレスベースのスパム対策
"""

import os
from uuid import UUID
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from database import get_db
from models import Progression, Pattern, Song, BlockedIP
from schemas import (
    ProgressionCreate, ProgressionUpdate, ProgressionResponse, 
    ProgressionListResponse, AdminAction, BlockIPRequest, 
    BlockedIPResponse, DiffResponse
)
from chord_utils import normalize_chords_for_search, normalize_chord, normalize_search_query, get_chord_options

# FastAPIアプリケーション初期化
app = FastAPI(title="Chord Progress Share API", version="1.0.0")

# CORS設定(開発環境用、本番環境では適切なオリジンを設定すること)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 環境変数から管理者パスワードを取得(デフォルト: admin123)
# 本番環境では必ず環境変数で安全なパスワードを設定すること
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


def get_client_ip(request: Request) -> str:
    """クライアントIPアドレスを取得
    
    プロキシ経由の場合はX-Forwarded-Forヘッダーから取得。
    直接接続の場合はrequest.client.hostを使用。
    
    Args:
        request: FastAPIのRequestオブジェクト
    
    Returns:
        str: クライアントのIPアドレス
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def check_ip_blocked(request: Request, db: AsyncSession = Depends(get_db)):
    """IPブロックチェック
    
    ブロックされたIPアドレスからのアクセスを拒否する。
    
    Args:
        request: FastAPIのRequestオブジェクト
        db: データベースセッション
    
    Returns:
        str: クライアントのIPアドレス
    
    Raises:
        HTTPException: ブロックされたIPの場合403エラー
    """
    ip = get_client_ip(request)
    result = await db.execute(
        select(BlockedIP).where(BlockedIP.ip_address == ip)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="このIPアドレスからの投稿は制限されています")
    return ip


# ====================
# Public Endpoints(一般ユーザー向けAPI)
# ====================

@app.get("/api/progressions", response_model=List[ProgressionListResponse])
async def get_progressions(
    query: Optional[str] = Query(None, description="タイトル・備考検索"),
    chord_query: Optional[str] = Query(None, description="コード進行検索"),
    db: AsyncSession = Depends(get_db)
):
    """承認済みコード進行一覧を取得"""
    stmt = select(Progression).where(
        Progression.status == "approved"
    ).options(selectinload(Progression.patterns))
    
    # タイトル・備考検索
    if query:
        stmt = stmt.where(
            or_(
                Progression.title.ilike(f"%{query}%"),
                Progression.remarks.ilike(f"%{query}%")
            )
        )
    
    # コード進行検索
    if chord_query:
        # 検索クエリを正規化（全角ローマ数字→半角、区切り文字の整理）
        normalized_query = normalize_search_query(chord_query)
        stmt = stmt.where(
            Progression.normalized_chords.ilike(f"%{normalized_query}%")
        )
    
    stmt = stmt.order_by(Progression.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@app.get("/api/progressions/{progression_id}", response_model=ProgressionResponse)
async def get_progression(
    progression_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """コード進行詳細を取得"""
    stmt = select(Progression).where(
        and_(Progression.id == progression_id, Progression.status == "approved")
    ).options(
        selectinload(Progression.patterns),
        selectinload(Progression.songs)
    )
    result = await db.execute(stmt)
    progression = result.scalar_one_or_none()
    
    if not progression:
        raise HTTPException(status_code=404, detail="コード進行が見つかりません")
    
    return progression


@app.post("/api/progressions", response_model=ProgressionResponse)
async def create_progression(
    data: ProgressionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(check_ip_blocked)
):
    """新規コード進行を投稿(承認待ち状態)"""
    # パターンデータを正規化
    patterns_data = [{"chords": p.chords, "label": p.label} for p in data.patterns]
    normalized = normalize_chords_for_search(patterns_data)
    
    # Progression作成
    progression = Progression(
        title=data.title,
        remarks=data.remarks,
        status="pending",
        normalized_chords=normalized,
        ip_address=ip
    )
    db.add(progression)
    await db.flush()
    
    # Patterns作成
    for i, pattern_data in enumerate(data.patterns):
        pattern = Pattern(
            progression_id=progression.id,
            label=pattern_data.label,
            chords=pattern_data.chords,
            sort_order=i
        )
        db.add(pattern)
    
    # Songs作成
    for song_data in data.songs or []:
        song = Song(
            progression_id=progression.id,
            name=song_data.name,
            artist=song_data.artist,
            youtube_url=song_data.youtube_url,
            spotify_url=song_data.spotify_url,
            apple_music_url=song_data.apple_music_url
        )
        db.add(song)
    
    await db.commit()
    await db.refresh(progression)
    
    # 関連データを含めて返す
    stmt = select(Progression).where(
        Progression.id == progression.id
    ).options(
        selectinload(Progression.patterns),
        selectinload(Progression.songs)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


@app.post("/api/progressions/{progression_id}/edit", response_model=ProgressionResponse)
async def request_edit(
    progression_id: UUID,
    data: ProgressionUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(check_ip_blocked)
):
    """既存コード進行の編集リクエスト(承認待ち状態で新規作成)"""
    # 元の投稿が存在するか確認
    stmt = select(Progression).where(
        and_(Progression.id == progression_id, Progression.status == "approved")
    )
    result = await db.execute(stmt)
    original = result.scalar_one_or_none()
    
    if not original:
        raise HTTPException(status_code=404, detail="編集対象のコード進行が見つかりません")
    
    # パターンデータを正規化
    patterns_data = [{"chords": p.chords, "label": p.label} for p in data.patterns]
    normalized = normalize_chords_for_search(patterns_data)
    
    # 編集リクエストとして新規Progression作成
    edit_request = Progression(
        title=data.title,
        remarks=data.remarks,
        status="pending",
        normalized_chords=normalized,
        ip_address=ip,
        original_id=progression_id  # 元の投稿を参照
    )
    db.add(edit_request)
    await db.flush()
    
    # Patterns作成
    for i, pattern_data in enumerate(data.patterns):
        pattern = Pattern(
            progression_id=edit_request.id,
            label=pattern_data.label,
            chords=pattern_data.chords,
            sort_order=i
        )
        db.add(pattern)
    
    # Songs作成
    for song_data in data.songs or []:
        song = Song(
            progression_id=edit_request.id,
            name=song_data.name,
            artist=song_data.artist,
            youtube_url=song_data.youtube_url,
            spotify_url=song_data.spotify_url,
            apple_music_url=song_data.apple_music_url
        )
        db.add(song)
    
    await db.commit()
    
    stmt = select(Progression).where(
        Progression.id == edit_request.id
    ).options(
        selectinload(Progression.patterns),
        selectinload(Progression.songs)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


@app.get("/api/chord-options")
async def get_chord_options_endpoint():
    """コード入力用のオプション一覧を取得"""
    return get_chord_options()


# ====================
# Admin Endpoints(管理者専用API)
# ====================

def verify_admin(password: str = Query(..., alias="admin_password")):
    """管理者パスワード認証"""
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="認証に失敗しました")
    return True


@app.get("/api/admin/pending", response_model=List[ProgressionResponse])
async def get_pending_progressions(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin)
):
    """承認待ちの投稿一覧を取得"""
    stmt = select(Progression).where(
        Progression.status == "pending"
    ).options(
        selectinload(Progression.patterns),
        selectinload(Progression.songs)
    ).order_by(Progression.created_at.asc())
    
    result = await db.execute(stmt)
    return result.scalars().all()


@app.get("/api/admin/pending/{progression_id}/diff", response_model=DiffResponse)
async def get_diff(
    progression_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin)
):
    """編集リクエストの差分を取得"""
    # 編集リクエストを取得
    stmt = select(Progression).where(
        and_(Progression.id == progression_id, Progression.status == "pending")
    ).options(
        selectinload(Progression.patterns),
        selectinload(Progression.songs)
    )
    result = await db.execute(stmt)
    updated = result.scalar_one_or_none()
    
    if not updated:
        raise HTTPException(status_code=404, detail="承認待ちの投稿が見つかりません")
    
    original = None
    if updated.original_id:
        # 元の投稿を取得
        stmt = select(Progression).where(
            Progression.id == updated.original_id
        ).options(
            selectinload(Progression.patterns),
            selectinload(Progression.songs)
        )
        result = await db.execute(stmt)
        original = result.scalar_one_or_none()
    
    return DiffResponse(original=original, updated=updated)


@app.post("/api/admin/pending/{progression_id}")
async def process_pending(
    progression_id: UUID,
    action: AdminAction,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin)
):
    """承認待ちの投稿を処理"""
    stmt = select(Progression).where(
        and_(Progression.id == progression_id, Progression.status == "pending")
    )
    result = await db.execute(stmt)
    progression = result.scalar_one_or_none()
    
    if not progression:
        raise HTTPException(status_code=404, detail="承認待ちの投稿が見つかりません")
    
    if action.action == "approve":
        if progression.original_id:
            # 編集リクエストの場合、元の投稿を削除
            stmt = select(Progression).where(Progression.id == progression.original_id)
            result = await db.execute(stmt)
            original = result.scalar_one_or_none()
            if original:
                await db.delete(original)
            progression.original_id = None
        
        progression.status = "approved"
        await db.commit()
        return {"message": "投稿を承認しました"}
    
    elif action.action == "reject":
        await db.delete(progression)
        await db.commit()
        return {"message": "投稿を却下しました"}
    
    else:
        raise HTTPException(status_code=400, detail="無効なアクションです")


@app.get("/api/admin/blocked-ips", response_model=List[BlockedIPResponse])
async def get_blocked_ips(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin)
):
    """ブロック中のIPアドレス一覧を取得"""
    stmt = select(BlockedIP).order_by(BlockedIP.blocked_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@app.post("/api/admin/blocked-ips", response_model=BlockedIPResponse)
async def block_ip(
    data: BlockIPRequest,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin)
):
    """IPアドレスをブロック"""
    # 既存確認
    stmt = select(BlockedIP).where(BlockedIP.ip_address == data.ip_address)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="このIPアドレスは既にブロックされています")
    
    blocked_ip = BlockedIP(
        ip_address=data.ip_address,
        reason=data.reason
    )
    db.add(blocked_ip)
    await db.commit()
    await db.refresh(blocked_ip)
    
    return blocked_ip


@app.delete("/api/admin/blocked-ips/{ip_id}")
async def unblock_ip(
    ip_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin)
):
    """IPアドレスのブロックを解除"""
    stmt = select(BlockedIP).where(BlockedIP.id == ip_id)
    result = await db.execute(stmt)
    blocked_ip = result.scalar_one_or_none()
    
    if not blocked_ip:
        raise HTTPException(status_code=404, detail="ブロック情報が見つかりません")
    
    await db.delete(blocked_ip)
    await db.commit()
    
    return {"message": "ブロックを解除しました"}


@app.get("/health")
async def health_check():
    """ヘルスチェック"""
    return {"status": "ok"}
