# VPSへのデプロイ手順

## 前提条件
- Ubuntu 20.04/22.04 以上のVPS
- Docker と Docker Compose がインストール済み
- ドメインがVPSのIPアドレスに向いている（SSL使用時）

## 1. サーバーにDockerをインストール（未インストールの場合）

```bash
# Dockerインストール
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Composeインストール（最新版）
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 現在のユーザーをdockerグループに追加
sudo usermod -aG docker $USER
# ログアウト＆ログインで反映
```

## 2. プロジェクトをサーバーに配置

```bash
# Gitでクローン
git clone https://github.com/your-username/ChordProgressShare.git
cd ChordProgressShare

# または、ローカルからrsyncでアップロード
# rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '__pycache__' ./ user@your-server:/path/to/ChordProgressShare/
```

## 3. 環境変数を設定

```bash
# .env.example をコピー
cp .env.example .env

# 編集して本番用の値を設定
nano .env
```

**.env の設定例:**
```
DB_USER=chord_user
DB_PASSWORD=強力なパスワードを設定
DB_NAME=chord_progress_db
ADMIN_PASSWORD=管理者パスワードを設定
CORS_ORIGINS=http://your-domain.com,https://your-domain.com
API_URL=https://your-domain.com
```

## 4. nginx設定を更新

```bash
# ドメイン名を設定
nano nginx/nginx.conf
# server_name _; の部分を実際のドメインに変更
# server_name your-domain.com;
```

## 5. ビルド＆起動

```bash
# 本番用でビルド＆起動
docker-compose -f docker-compose.prod.yml up -d --build

# ログ確認
docker-compose -f docker-compose.prod.yml logs -f
```

## 6. SSL証明書の取得（Let's Encrypt）

```bash
# certbotコンテナで証明書取得
docker run -it --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d your-domain.com

# 証明書を適切な場所にコピー
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/

# nginx.confのHTTPS部分をコメント解除
nano nginx/nginx.conf

# 再起動
docker-compose -f docker-compose.prod.yml restart nginx
```

## 便利なコマンド

```bash
# 状態確認
docker-compose -f docker-compose.prod.yml ps

# ログ確認
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# 再起動
docker-compose -f docker-compose.prod.yml restart

# 停止
docker-compose -f docker-compose.prod.yml down

# データベースを含めて完全削除（注意！）
docker-compose -f docker-compose.prod.yml down -v
```

## トラブルシューティング

### ポートが使用中
```bash
sudo lsof -i :80
sudo lsof -i :443
# 使用中のプロセスを停止
```

### データベース接続エラー
```bash
# DBコンテナの状態確認
docker-compose -f docker-compose.prod.yml logs db
# DBに直接接続
docker-compose -f docker-compose.prod.yml exec db psql -U chord_user -d chord_progress_db
```

### フロントエンドビルドエラー
```bash
# フロントエンドを再ビルド
docker-compose -f docker-compose.prod.yml build --no-cache frontend
```
