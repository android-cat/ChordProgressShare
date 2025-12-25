# Chord Progress Share

度数（ディグリーネーム）によるコード進行を投稿・共有・検索できるWebサイト

## 概要

ユーザーは投稿されたコードをブラウザ上で試聴でき、管理者の承認を経てコンテンツが公開されるWiki形式のプラットフォームです。

## 主な機能

### ユーザー機能
- **コード進行投稿・編集**
  - プルダウン連鎖選択方式によるコード入力
  - 1小節2拍ずつ、最大8小節（16枠）
  - 複数パターンの登録可能（基本形、派生形など）
  - 使用楽曲の紐付け（YouTube, Spotify, Apple Music）
  
- **試聴機能**
  - Tone.jsによるピアノ音色での再生
  - リアルタイム再生位置のハイライト表示

- **検索・閲覧**
  - 名称・備考による全文検索
  - コード進行パターンによる部分一致検索

### 管理者機能
- 承認待ちリストの管理
- 編集リクエストの差分確認
- IPアドレスベースのアクセス制限

## 技術スタック

- **Frontend**: Next.js 14 (React), TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: FastAPI (Python), SQLAlchemy
- **Database**: PostgreSQL
- **Sound**: Tone.js
- **Infrastructure**: Docker / Docker Compose

## セットアップ

### 前提条件
- Docker
- Docker Compose

### 起動方法

```bash
# リポジトリをクローン
git clone <repository-url>
cd ChordProgressShare

# Dockerコンテナを起動
docker-compose up --build
```

### アクセスURL
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000
- API ドキュメント: http://localhost:8000/docs
- 管理者画面: http://localhost:3000/admin

### 管理者ログイン
- デフォルトパスワード: `admin123`
- 本番環境では環境変数 `ADMIN_PASSWORD` で変更してください

## プロジェクト構造

```
ChordProgressShare/
├── backend/              # FastAPI バックエンド
│   ├── main.py          # APIエンドポイント
│   ├── models.py        # SQLAlchemyモデル
│   ├── schemas.py       # Pydanticスキーマ
│   ├── database.py      # DB接続設定
│   ├── chord_utils.py   # コード処理ユーティリティ
│   ├── init.sql         # DBスキーマ初期化
│   └── requirements.txt # Python依存パッケージ
│
├── frontend/            # Next.js フロントエンド
│   ├── app/            # Next.js App Router
│   │   ├── page.tsx           # トップページ
│   │   ├── admin/page.tsx     # 管理者画面
│   │   └── progressions/[id]/ # 詳細ページ
│   ├── components/     # Reactコンポーネント
│   │   ├── ChordInput.tsx       # コード入力UI
│   │   ├── ProgressionForm.tsx  # 投稿フォーム
│   │   └── ProgressionCard.tsx  # カード表示
│   ├── lib/           # ユーティリティ
│   │   ├── api.ts    # API通信
│   │   └── audio.ts  # Tone.js音声再生
│   └── package.json
│
└── docker-compose.yml  # Docker構成
```

## データ構造

### Progression（コード進行）
```typescript
{
  id: string,
  title: string,
  remarks: string,
  status: "pending" | "approved" | "rejected",
  patterns: [
    {
      label: string,
      chords: [string | null]  // 16枠
    }
  ],
  songs: [
    {
      name: string,
      artist: string,
      youtube_url: string,
      spotify_url: string,
      apple_music_url: string
    }
  ]
}
```

## 開発

### バックエンド開発
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### フロントエンド開発
```bash
cd frontend
npm install
npm run dev
```

## ライセンス

MIT License

## 作者

Chord Progress Share Development Team
