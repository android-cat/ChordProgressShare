"""chord_utils.py のユニットテスト

normalize_chord, normalize_search_query, normalize_chords_for_search,
search_in_normalized, get_chord_options の各関数をテスト。
DB不要で単体で実行可能。
"""

import pytest
import sys
import os

# バックエンドのルートディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chord_utils import (
    normalize_chord,
    normalize_search_query,
    normalize_chords_for_search,
    search_in_normalized,
    get_chord_options,
    DEGREES,
    QUALITIES,
)


# ==================================================
# normalize_chord
# ==================================================

class TestNormalizeChord:
    def test_none_returns_empty_string(self):
        assert normalize_chord(None) == ""

    def test_ascii_chord_unchanged(self):
        assert normalize_chord("IV") == "IV"

    def test_fullwidth_roman_numeral_single(self):
        assert normalize_chord("Ⅰ") == "I"
        assert normalize_chord("Ⅱ") == "II"
        assert normalize_chord("Ⅲ") == "III"
        assert normalize_chord("Ⅳ") == "IV"
        assert normalize_chord("Ⅴ") == "V"
        assert normalize_chord("Ⅵ") == "VI"
        assert normalize_chord("Ⅶ") == "VII"

    def test_fullwidth_roman_numeral_lowercase(self):
        assert normalize_chord("ⅰ") == "I"
        assert normalize_chord("ⅱ") == "II"
        assert normalize_chord("ⅲ") == "III"
        assert normalize_chord("ⅳ") == "IV"
        assert normalize_chord("ⅴ") == "V"
        assert normalize_chord("ⅵ") == "VI"
        assert normalize_chord("ⅶ") == "VII"

    def test_sharp_symbol_converted(self):
        assert normalize_chord("♯IV") == "#IV"
        assert normalize_chord("＃IV") == "#IV"

    def test_flat_symbol_converted(self):
        assert normalize_chord("♭VII") == "bVII"

    def test_combined_fullwidth_chord(self):
        assert normalize_chord("Ⅳmaj7") == "IVmaj7"
        assert normalize_chord("♭Ⅶ") == "bVII"
        assert normalize_chord("♭Ⅶm7") == "bVIIm7"
        assert normalize_chord("Ⅱm7") == "IIm7"

    def test_empty_string(self):
        assert normalize_chord("") == ""

    def test_already_normalized(self):
        assert normalize_chord("IVmaj7") == "IVmaj7"
        assert normalize_chord("bVIIm7") == "bVIIm7"


# ==================================================
# normalize_search_query
# ==================================================

class TestNormalizeSearchQuery:
    def test_none_returns_empty(self):
        assert normalize_search_query(None) == ""

    def test_empty_string_returns_empty(self):
        assert normalize_search_query("") == ""

    def test_simple_chord(self):
        assert normalize_search_query("IV") == "IV"

    def test_pipe_separated(self):
        result = normalize_search_query("IV|V")
        assert result == "IV|V"

    def test_multiple_pipes_collapsed(self):
        result = normalize_search_query("|Ⅳ||Ⅴ|")
        assert result == "IV|V"

    def test_spaces_converted_to_pipe(self):
        result = normalize_search_query("IV V IIIm")
        assert result == "IV|V|IIIm"

    def test_hyphens_converted_to_pipe(self):
        result = normalize_search_query("IV-V-IIIm")
        assert result == "IV|V|IIIm"

    def test_fullwidth_roman_numerals_in_query(self):
        result = normalize_search_query("Ⅳ Ⅴ")
        assert result == "IV|V"

    def test_flat_in_query(self):
        result = normalize_search_query("♭VII")
        assert result == "bVII"

    def test_leading_trailing_whitespace(self):
        result = normalize_search_query("  IV V  ")
        assert result == "IV|V"


# ==================================================
# normalize_chords_for_search
# ==================================================

class TestNormalizeChordsForSearch:
    def test_single_pattern(self):
        patterns = [{"chords": ["IV", "V", "IIIm", "VIm"]}]
        result = normalize_chords_for_search(patterns)
        assert result == "IV|V|IIIm|VIm"

    def test_multiple_patterns(self):
        patterns = [
            {"chords": ["IV", "V", "IIIm", "VIm"]},
            {"chords": ["IV", "V", "III", "VIm"]},
        ]
        result = normalize_chords_for_search(patterns)
        assert result == "IV|V|IIIm|VIm||IV|V|III|VIm"

    def test_none_values_skipped(self):
        patterns = [{"chords": ["IV", None, "V", None]}]
        result = normalize_chords_for_search(patterns)
        assert result == "IV|V"

    def test_empty_chords(self):
        patterns = [{"chords": []}]
        result = normalize_chords_for_search(patterns)
        assert result == ""

    def test_empty_patterns(self):
        result = normalize_chords_for_search([])
        assert result == ""

    def test_fullwidth_roman_converted_in_patterns(self):
        patterns = [{"chords": ["Ⅳ", "Ⅴ", "Ⅲm", "Ⅵm"]}]
        result = normalize_chords_for_search(patterns)
        assert result == "IV|V|IIIm|VIm"

    def test_missing_chords_key(self):
        patterns = [{"label": "A"}]
        result = normalize_chords_for_search(patterns)
        assert result == ""


# ==================================================
# search_in_normalized
# ==================================================

class TestSearchInNormalized:
    def test_empty_query_returns_false(self):
        assert search_in_normalized("IV|V|IIIm|VIm", "") is False

    def test_empty_normalized_returns_false(self):
        assert search_in_normalized("", "IV") is False

    def test_simple_match(self):
        assert search_in_normalized("IV|V|IIIm|VIm", "IV") is True

    def test_no_match(self):
        # 実装は部分文字列マッチのため、"II"は"IIIm"にマッチする。
        # 完全に存在しない度数でテスト
        assert search_in_normalized("IV|V|IIIm|VIm", "bVII") is False

    def test_sequence_match(self):
        assert search_in_normalized("IV|V|IIIm|VIm", "IV-V") is True

    def test_cross_pattern_no_false_positive(self):
        # "VIm||IV" は2パターン境界をまたぐので検索ではヒットすべきでない
        normalized = "IV|V|VIm||IIm|V|I"
        # VIm|IIm は1パターン内にはないのでヒットしない
        assert search_in_normalized(normalized, "VIm-IIm") is False

    def test_fullwidth_in_query_converted(self):
        assert search_in_normalized("IV|V|IIIm|VIm", "Ⅳ") is True


# ==================================================
# get_chord_options
# ==================================================

class TestGetChordOptions:
    def test_returns_dict_with_expected_keys(self):
        options = get_chord_options()
        assert "degrees" in options
        assert "modifiers" in options
        assert "qualities" in options

    def test_degrees_not_empty(self):
        options = get_chord_options()
        assert len(options["degrees"]) > 0

    def test_degrees_contains_standard(self):
        options = get_chord_options()
        for degree in ["I", "II", "III", "IV", "V", "VI", "VII"]:
            assert degree in options["degrees"]

    def test_modifiers_contains_expected(self):
        options = get_chord_options()
        assert "" in options["modifiers"]   # ナチュラル
        assert "#" in options["modifiers"]  # シャープ
        assert "b" in options["modifiers"]  # フラット

    def test_qualities_not_empty(self):
        options = get_chord_options()
        assert len(options["qualities"]) > 0

    def test_qualities_contains_common(self):
        options = get_chord_options()
        assert "" in options["qualities"]     # メジャー
        assert "m" in options["qualities"]    # マイナー
        assert "7" in options["qualities"]    # セブンス
        assert "maj7" in options["qualities"] # メジャーセブンス
        assert "m7" in options["qualities"]   # マイナーセブンス
