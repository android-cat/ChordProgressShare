"""pytest フィクスチャ定義

テスト用の非同期DBセッションとHTTPクライアントを提供。
PostgreSQLテストDBが必要 (TEST_DATABASE_URL 環境変数、またはデフォルト値を使用)。

## 実行方法
# docker-compose の db コンテナを起動した状態で:
#   cd backend
#   pytest

# テストDB URLを指定する場合:
#   TEST_DATABASE_URL=postgresql+asyncpg://chord_user:chord_password@localhost:5432/chord_test_db pytest
"""

import os
import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import text

# テスト対象のモジュールをパスに追加
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from main import app

# 環境変数からテスト用DBのURLを取得
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://chord_user:chord_password@localhost:5432/chord_test_db",
)

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
TestSessionLocal = sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """セッション開始時にテーブルを作成し、終了時に削除する

    同期 fixture として実行することで、pytest-asyncio の
    イベントループスコープ問題を回避する。
    """
    asyncio.run(_create_tables())
    yield
    asyncio.run(_drop_tables())


async def _create_tables():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def _drop_tables():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def clean_db(setup_database):
    """各テスト後にすべてのテーブルデータを削除する"""
    yield
    async with TestSessionLocal() as session:
        # 外部キー制約の順序に従って削除
        await session.execute(text("DELETE FROM feedbacks"))
        await session.execute(text("DELETE FROM blocked_ips"))
        await session.execute(text("DELETE FROM songs"))
        await session.execute(text("DELETE FROM patterns"))
        # 自己参照FKを先にNULLに戻してから削除
        await session.execute(text("UPDATE progressions SET original_id = NULL"))
        await session.execute(text("DELETE FROM progressions"))
        await session.commit()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """テスト用DBセッションを提供する"""
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """依存性注入でテストDBを使うHTTPクライアントを提供する
    
    リクエストごとに独立したセッションを生成することで
    asyncpgの「cannot perform operation: another operation is in progress」を回避する。
    """

    async def override_get_db():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()



