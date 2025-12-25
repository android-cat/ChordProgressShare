"""データベース接続設定

SQLAlchemy非同期エンジンの設定とセッション管理。
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

# 環境変数からDB接続URLを取得
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://chord_user:chord_password@localhost:5432/chord_progress_db")
# asyncpg用にURLを変換(postgresql:// → postgresql+asyncpg://)
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# 非同期エンジンの作成(echoをTrueにするとSQLログが出力される)
engine = create_async_engine(ASYNC_DATABASE_URL, echo=True)
# 非同期セッションファクトリーの作成
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
# ORMモデルのベースクラス
Base = declarative_base()

async def get_db():
    """FastAPI Dependencyとして使用するDBセッション生成関数
    
    Yields:
        AsyncSession: 非同期DBセッション
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
