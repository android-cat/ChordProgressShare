"""テスト共通ヘルパー関数"""


def make_progression_payload(
    title: str = "テスト進行",
    remarks: str = "備考テスト",
    chords: list = None,
    songs: list = None,
) -> dict:
    """投稿用のペイロードを生成するヘルパー"""
    return {
        "title": title,
        "remarks": remarks,
        "patterns": [
            {
                "label": "A",
                "chords": chords or ["IV", "V", "IIIm", "VIm", None, None, None, None,
                                     None, None, None, None, None, None, None, None],
            }
        ],
        "songs": songs or [],
    }
