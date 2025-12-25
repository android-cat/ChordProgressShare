-- コード進行テーブル
CREATE TABLE progressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    normalized_chords TEXT, -- 検索用正規化コード
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    original_id UUID REFERENCES progressions(id) ON DELETE SET NULL -- 編集リクエストの場合、元の投稿ID
);

-- パターンテーブル
CREATE TABLE patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    progression_id UUID NOT NULL REFERENCES progressions(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    chords JSONB NOT NULL, -- 16枠分の配列
    sort_order INT DEFAULT 0
);

-- 関連楽曲テーブル
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    progression_id UUID NOT NULL REFERENCES progressions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    youtube_url TEXT,
    spotify_url TEXT,
    apple_music_url TEXT
);

-- IPアドレス制限テーブル
CREATE TABLE blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    reason TEXT,
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ご意見・ご感想テーブル
CREATE TABLE feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45)
);

-- インデックス
CREATE INDEX idx_progressions_status ON progressions(status);
CREATE INDEX idx_progressions_normalized_chords ON progressions(normalized_chords);
CREATE INDEX idx_progressions_title ON progressions(title);
CREATE INDEX idx_patterns_progression_id ON patterns(progression_id);
CREATE INDEX idx_songs_progression_id ON songs(progression_id);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_progressions_updated_at
    BEFORE UPDATE ON progressions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
