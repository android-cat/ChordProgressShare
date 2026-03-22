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

### 事前確認
```bash
# 1. ドメインが正しくVPSのIPアドレスに向いているか確認
nslookup your-domain.com

# 2. ポート80が開いているか確認
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443

# 3. nginxコンテナが動作しているか確認
docker-compose -f docker-compose.prod.yml ps
curl http://localhost
```

### 方法1: Webroot方式（推奨）

```bash
# certbot用ディレクトリを作成
sudo mkdir -p /var/www/certbot

# nginx.confでwebrootパスが設定されているか確認（既に設定済み）
# location /.well-known/acme-challenge/ {
#     root /var/www/certbot;
# }

# 証明書取得
docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com

# 証明書をnginx/sslにコピー
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
```

### 方法2: スタンドアロン方式（nginxを一時停止）

nginxが80番ポートを使用中でwebroot方式が失敗する場合：

```bash
# nginxコンテナを一時停止
docker-compose -f docker-compose.prod.yml stop nginx

# スタンドアロンモードで証明書取得
docker run -it --rm \
  -p 80:80 \
  -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly \
  --standalone \
  --email fanu8931@gmail.com \
  --agree-tos \
  --no-eff-email \
  -d chordshare.jp

# nginxコンテナを再起動
docker-compose -f docker-compose.prod.yml start nginx
```

### 証明書の適用

```bash
# nginx.confのHTTPS部分をコメント解除
nano nginx/nginx.conf
# server { listen 443 ssl http2; ... } の部分をコメント解除

# HTTPからHTTPSへのリダイレクトを有効化
# return 301 https://$host$request_uri; をコメント解除

# nginx再起動
docker-compose -f docker-compose.prod.yml restart nginx

# HTTPSでアクセステスト
curl https://chordshare.jp
```

**HTTPSでアクセスできない場合の確認手順:**

```bash
# 1. 証明書ファイルが存在するか確認
ls -la nginx/ssl/
# fullchain.pem と privkey.pem があるはずです

# 2. 証明書の配置確認（nginx.confのパスと一致させる）
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/chordshare.jp/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/chordshare.jp/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/*.pem

# 3. nginx.confでHTTPS設定のコメントを解除
nano nginx/nginx.conf
# 以下を確認:
# - server { listen 443 ssl http2; ... } のコメント解除
# - server_name をchordshare.jpに変更
# - HTTPリダイレクト (return 301 https://$host$request_uri;) のコメント解除

# 4. nginx設定のテスト
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# 5. nginx再起動
docker-compose -f docker-compose.prod.yml restart nginx

# 6. ログ確認
docker-compose -f docker-compose.prod.yml logs nginx

# 7. HTTPとHTTPSの両方でテスト
curl -I http://chordshare.jp
curl -I https://chordshare.jp

# 8. 外部からアクセステスト
curl -I https://chordshare.jp
```

### 自動更新設定

```bash
# cronで毎日証明書の更新チェック
sudo crontab -e

# 以下を追加（毎日午前3時に実行）
0 3 * * * docker run --rm -v /etc/letsencrypt:/etc/letsencrypt certbot/certbot renew --quiet && docker-compose -f /path/to/ChordProgressShare/docker-compose.prod.yml restart nginx
```

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

### SSL証明書取得エラー

**エラー: Challenge failed**
```bash
# 1. ドメインのDNS設定を確認
dig your-domain.com
nslookup your-domain.com

# 2. ポート80がアクセス可能か確認
curl -I http://your-domain.com/.well-known/acme-challenge/test

# 3. ファイアウォール確認
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443

# 4. nginxログ確認
docker-compose -f docker-compose.prod.yml logs nginx

# 5. webrootディレクトリ権限確認
ls -la /var/www/certbot
sudo chmod 755 /var/www/certbot

# 6. スタンドアロン方式を試す（上記の「方法2」参照）
```

**エラー: Rate limit exceeded**
- Let's Encryptには制限があります（1週間に5回まで）
- 待つか、ステージング環境でテスト: `--staging` オプション追加

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
