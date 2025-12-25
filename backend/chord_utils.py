"""コード進行ユーティリティ

コード表記の正規化、検索用文字列生成、度数・クオリティオプション提供など。
"""

import re
from typing import List, Optional


def normalize_chord(chord: Optional[str]) -> str:
    """コード表記を正規化する
    
    全角ローマ数字や音楽記号を半角英数字に変換。
    例: Ⅳmaj7 → IVmaj7, ♭Ⅶ → bVII
    
    Args:
        chord: コード文字列(例: "Ⅳmaj7", "♭Ⅶ")
    
    Returns:
        正規化されたコード文字列
    """
    if chord is None:
        return ""
    
    # ローマ数字の変換マップ
    roman_map = {
        'Ⅰ': 'I', 'Ⅱ': 'II', 'Ⅲ': 'III', 'Ⅳ': 'IV',
        'Ⅴ': 'V', 'Ⅵ': 'VI', 'Ⅶ': 'VII',
        'ⅰ': 'I', 'ⅱ': 'II', 'ⅲ': 'III', 'ⅳ': 'IV',
        'ⅴ': 'V', 'ⅵ': 'VI', 'ⅶ': 'VII',
    }
    
    # 記号の変換マップ
    symbol_map = {
        '♯': '#',
        '♭': 'b',
        '＃': '#',
    }
    
    result = chord
    
    # ローマ数字を変換
    for old, new in roman_map.items():
        result = result.replace(old, new)
    
    # 記号を変換
    for old, new in symbol_map.items():
        result = result.replace(old, new)
    
    return result


def normalize_search_query(query: Optional[str]) -> str:
    """検索クエリを正規化する
    
    全角ローマ数字や音楽記号を半角に変換し、
    表示用の区切り文字（|など）を検索用の形式に変換。
    例: |Ⅳ||Ⅴ| → IV|V
    
    Args:
        query: 検索クエリ文字列
    
    Returns:
        正規化された検索クエリ
    """
    if not query:
        return ""
    
    # まず文字を正規化
    normalized = normalize_chord(query)
    
    # 連続する|を1つにまとめる
    normalized = re.sub(r'\|+', '|', normalized)
    
    # 前後の|を削除
    normalized = normalized.strip('|')
    
    # スペースやハイフンも|として扱う
    normalized = re.sub(r'[-\s]+', '|', normalized)
    
    return normalized


def normalize_chords_for_search(patterns: List[dict]) -> str:
    """複数パターンのコードを検索用に正規化した文字列に変換
    
    パターン内はパイプ(|)で、パターン間はダブルパイプ(||)で区切る。
    例: [["IV", "V", "IIIm", "VIm"], ["IV", "V", "III", "VIm"]] 
        → "IV|V|IIIm|VIm||IV|V|III|VIm"
    
    Args:
        patterns: パターンリスト、各パターンは{"chords": [...]}の形式
    
    Returns:
        検索用正規化文字列
    """
    normalized_patterns = []
    
    for pattern in patterns:
        chords = pattern.get("chords", [])
        normalized_chords = [normalize_chord(c) for c in chords if c]
        normalized_patterns.append("|".join(normalized_chords))
    
    return "||".join(normalized_patterns)


def search_in_normalized(normalized_chords: str, query: str) -> bool:
    """正規化されたコード文字列内でクエリを検索
    
    クエリ内のハイフンやスペースをパイプに変換して部分一致検索。
    
    Args:
        normalized_chords: 正規化済みコード文字列
        query: 検索クエリ(例: "IV-V", "IIIm VIm")
    
    Returns:
        マッチした場合True
    """
    if not query or not normalized_chords:
        return False
    
    # クエリも正規化
    normalized_query = normalize_chord(query)
    
    # パイプ区切りを考慮した部分一致検索
    # クエリ内のハイフンやスペースをパイプに変換
    query_parts = re.split(r'[-\s|]+', normalized_query)
    query_pattern = '|'.join(filter(None, query_parts))
    
    pattern = re.escape(query_pattern).replace(r'\|', r'\|')
    return bool(re.search(pattern, normalized_chords, re.IGNORECASE))


# 度数リスト(I〜VII)
DEGREES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
# 変化記号(ナチュラル、シャープ、フラット)
DEGREE_MODIFIERS = ['', '#', 'b']

# クオリティリスト(メジャー、マイナー、各種テンション)
QUALITIES = [
    '',      # メジャー
    'm',     # マイナー
    '7',     # セブンス
    'maj7',  # メジャーセブンス
    'm7',    # マイナーセブンス
    'dim',   # ディミニッシュ
    'dim7',  # ディミニッシュセブンス
    'aug',   # オーギュメント
    'sus4',  # サスフォー
    'sus2',  # サスツー
    '7sus4', # セブンサスフォー
    'add9',  # アドナインス
    'm7b5',  # マイナーセブンフラットファイブ
    '6',     # シックス
    'm6',    # マイナーシックス
    '9',     # ナインス
    'maj9',  # メジャーナインス
    'm9',    # マイナーナインス
]


def get_chord_options():
    """フロントエンド用のコードオプションを生成
    
    度数、変化記号、クオリティのリストを返す。
    プルダウン選択UI用のデータ提供に使用。
    
    Returns:
        dict: {"degrees": [...], "modifiers": [...], "qualities": [...]}
    """
    return {
        "degrees": DEGREES,
        "modifiers": DEGREE_MODIFIERS,
        "qualities": QUALITIES,
    }
