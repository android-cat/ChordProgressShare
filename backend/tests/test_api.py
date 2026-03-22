"""APIエンドポイントの統合テスト

PostgreSQLテストDBを使用してHTTPレベルでAPIをテスト。
実行前に docker-compose の db サービスが起動している必要がある。

## 実行方法
#   cd backend
#   pytest tests/test_api.py -v
"""

import pytest
from httpx import AsyncClient

from helpers import make_progression_payload


# ==================================================
# ヘルスチェック
# ==================================================

class TestHealthCheck:
    async def test_health_ok(self, client: AsyncClient):
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


# ==================================================
# コードオプション取得
# ==================================================

class TestChordOptions:
    async def test_get_chord_options_returns_expected_keys(self, client: AsyncClient):
        response = await client.get("/api/chord-options")
        assert response.status_code == 200
        body = response.json()
        assert "degrees" in body
        assert "modifiers" in body
        assert "qualities" in body

    async def test_degrees_include_standard(self, client: AsyncClient):
        response = await client.get("/api/chord-options")
        degrees = response.json()["degrees"]
        for d in ["I", "II", "III", "IV", "V", "VI", "VII"]:
            assert d in degrees


# ==================================================
# コード進行一覧取得
# ==================================================

class TestGetProgressions:
    async def test_empty_list(self, client: AsyncClient):
        response = await client.get("/api/progressions")
        assert response.status_code == 200
        assert response.json() == []

    async def test_pending_progression_not_shown(self, client: AsyncClient):
        # 投稿直後は pending なので一覧に表示されない
        await client.post("/api/progressions", json=make_progression_payload())
        response = await client.get("/api/progressions")
        assert response.json() == []

    async def test_approved_progression_shown(self, client: AsyncClient):
        post_res = await client.post(
            "/api/progressions", json=make_progression_payload(title="承認済み")
        )
        progression_id = post_res.json()["id"]

        # 管理者が承認
        await client.post(
            f"/api/admin/pending/{progression_id}",
            json={"action": "approve"},
            params={"admin_password": "admin123"},
        )

        response = await client.get("/api/progressions")
        assert response.status_code == 200
        titles = [p["title"] for p in response.json()]
        assert "承認済み" in titles

    async def test_search_by_title(self, client: AsyncClient):
        # 2件投稿して承認
        for title in ["カノン進行", "王道進行"]:
            res = await client.post(
                "/api/progressions", json=make_progression_payload(title=title)
            )
            await client.post(
                f"/api/admin/pending/{res.json()['id']}",
                json={"action": "approve"},
                params={"admin_password": "admin123"},
            )

        response = await client.get("/api/progressions", params={"query": "カノン"})
        assert response.status_code == 200
        results = response.json()
        assert len(results) == 1
        assert results[0]["title"] == "カノン進行"

    async def test_search_by_chord(self, client: AsyncClient):
        res = await client.post(
            "/api/progressions",
            json=make_progression_payload(
                title="IV-V進行",
                chords=["IV", "V", None, None, None, None, None, None,
                        None, None, None, None, None, None, None, None],
            ),
        )
        await client.post(
            f"/api/admin/pending/{res.json()['id']}",
            json={"action": "approve"},
            params={"admin_password": "admin123"},
        )

        response = await client.get("/api/progressions", params={"chord_query": "IV|V"})
        assert response.status_code == 200
        assert len(response.json()) == 1


# ==================================================
# コード進行詳細取得
# ==================================================

class TestGetProgression:
    async def test_approved_progression_detail(self, client: AsyncClient):
        post_res = await client.post(
            "/api/progressions",
            json=make_progression_payload(title="詳細テスト", remarks="備考"),
        )
        progression_id = post_res.json()["id"]

        await client.post(
            f"/api/admin/pending/{progression_id}",
            json={"action": "approve"},
            params={"admin_password": "admin123"},
        )

        response = await client.get(f"/api/progressions/{progression_id}")
        assert response.status_code == 200
        body = response.json()
        assert body["title"] == "詳細テスト"
        assert body["remarks"] == "備考"
        assert body["status"] == "approved"
        assert len(body["patterns"]) == 1

    async def test_pending_progression_returns_404(self, client: AsyncClient):
        post_res = await client.post(
            "/api/progressions", json=make_progression_payload()
        )
        progression_id = post_res.json()["id"]

        response = await client.get(f"/api/progressions/{progression_id}")
        assert response.status_code == 404

    async def test_nonexistent_progression_returns_404(self, client: AsyncClient):
        response = await client.get(
            "/api/progressions/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404


# ==================================================
# コード進行投稿
# ==================================================

class TestCreateProgression:
    async def test_create_progression_returns_pending(self, client: AsyncClient):
        response = await client.post(
            "/api/progressions", json=make_progression_payload()
        )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "pending"
        assert body["title"] == "テスト進行"
        assert len(body["patterns"]) == 1

    async def test_create_progression_with_song(self, client: AsyncClient):
        payload = make_progression_payload(
            title="楽曲付き進行",
            songs=[{"name": "テスト曲", "artist": "テストアーティスト"}],
        )
        response = await client.post("/api/progressions", json=payload)
        assert response.status_code == 200
        body = response.json()
        assert len(body["songs"]) == 1
        assert body["songs"][0]["name"] == "テスト曲"

    async def test_create_progression_normalizes_chords(self, client: AsyncClient):
        payload = make_progression_payload(
            chords=["Ⅳ", "Ⅴ", "Ⅲm", "Ⅵm", None, None, None, None,
                    None, None, None, None, None, None, None, None],
        )
        response = await client.post("/api/progressions", json=payload)
        assert response.status_code == 200
        body = response.json()
        # normalized_chords に半角ローマ数字が使われていること
        assert "IV" in body["normalized_chords"]
        assert "Ⅳ" not in body["normalized_chords"]

    async def test_create_progression_blocked_ip_returns_403(self, client: AsyncClient):
        blocked_ip = "10.10.10.10"
        await client.post(
            "/api/admin/blocked-ips",
            json={"ip_address": blocked_ip, "reason": "テスト"},
            params={"admin_password": "admin123"},
        )
        response = await client.post(
            "/api/progressions",
            json=make_progression_payload(),
            headers={"X-Forwarded-For": blocked_ip},
        )
        assert response.status_code == 403


# ==================================================
# 編集リクエスト
# ==================================================

class TestEditProgression:
    async def test_edit_approved_progression(self, client: AsyncClient):
        # 承認済み投稿を作成
        post_res = await client.post(
            "/api/progressions", json=make_progression_payload(title="元タイトル")
        )
        progression_id = post_res.json()["id"]
        await client.post(
            f"/api/admin/pending/{progression_id}",
            json={"action": "approve"},
            params={"admin_password": "admin123"},
        )

        # 編集リクエスト
        edit_payload = make_progression_payload(title="編集タイトル")
        response = await client.post(
            f"/api/progressions/{progression_id}/edit", json=edit_payload
        )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "pending"
        assert body["title"] == "編集タイトル"
        assert str(body["original_id"]) == progression_id

    async def test_edit_nonexistent_returns_404(self, client: AsyncClient):
        response = await client.post(
            "/api/progressions/00000000-0000-0000-0000-000000000000/edit",
            json=make_progression_payload(),
        )
        assert response.status_code == 404


# ==================================================
# フィードバック
# ==================================================

class TestFeedback:
    async def test_create_feedback(self, client: AsyncClient):
        response = await client.post(
            "/api/feedback", json={"content": "テストフィードバック"}
        )
        assert response.status_code == 200
        body = response.json()
        assert body["content"] == "テストフィードバック"
        assert "id" in body
        assert "created_at" in body

    async def test_blocked_ip_cannot_post_feedback(self, client: AsyncClient):
        blocked_ip = "10.10.10.11"
        await client.post(
            "/api/admin/blocked-ips",
            json={"ip_address": blocked_ip, "reason": "テスト"},
            params={"admin_password": "admin123"},
        )
        response = await client.post(
            "/api/feedback",
            json={"content": "ブロック後のフィードバック"},
            headers={"X-Forwarded-For": blocked_ip},
        )
        assert response.status_code == 403


# ==================================================
# 管理者エンドポイント
# ==================================================

class TestAdminAuth:
    async def test_wrong_password_returns_401(self, client: AsyncClient):
        response = await client.get(
            "/api/admin/pending", params={"admin_password": "wrong"}
        )
        assert response.status_code == 401

    async def test_missing_password_returns_422(self, client: AsyncClient):
        response = await client.get("/api/admin/pending")
        assert response.status_code == 422


class TestAdminPending:
    async def test_get_pending_list(self, client: AsyncClient):
        await client.post("/api/progressions", json=make_progression_payload())

        response = await client.get(
            "/api/admin/pending", params={"admin_password": "admin123"}
        )
        assert response.status_code == 200
        assert len(response.json()) == 1

    async def test_approve_progression(self, client: AsyncClient):
        post_res = await client.post(
            "/api/progressions", json=make_progression_payload()
        )
        progression_id = post_res.json()["id"]

        response = await client.post(
            f"/api/admin/pending/{progression_id}",
            json={"action": "approve"},
            params={"admin_password": "admin123"},
        )
        assert response.status_code == 200
        assert response.json()["message"] == "投稿を承認しました"

        # 承認後は一覧に表示される
        list_res = await client.get("/api/progressions")
        assert len(list_res.json()) == 1

    async def test_reject_progression(self, client: AsyncClient):
        post_res = await client.post(
            "/api/progressions", json=make_progression_payload()
        )
        progression_id = post_res.json()["id"]

        response = await client.post(
            f"/api/admin/pending/{progression_id}",
            json={"action": "reject"},
            params={"admin_password": "admin123"},
        )
        assert response.status_code == 200
        assert response.json()["message"] == "投稿を却下しました"

        # 却下後は一覧に表示されない
        list_res = await client.get("/api/progressions")
        assert list_res.json() == []

    async def test_approve_edit_replaces_original(self, client: AsyncClient):
        # 元の投稿を承認
        post_res = await client.post(
            "/api/progressions", json=make_progression_payload(title="元タイトル")
        )
        original_id = post_res.json()["id"]
        await client.post(
            f"/api/admin/pending/{original_id}",
            json={"action": "approve"},
            params={"admin_password": "admin123"},
        )

        # 編集リクエストを作成・承認
        edit_res = await client.post(
            f"/api/progressions/{original_id}/edit",
            json=make_progression_payload(title="新タイトル"),
        )
        edit_id = edit_res.json()["id"]
        await client.post(
            f"/api/admin/pending/{edit_id}",
            json={"action": "approve"},
            params={"admin_password": "admin123"},
        )

        # 一覧では新タイトルのみが表示される
        list_res = await client.get("/api/progressions")
        titles = [p["title"] for p in list_res.json()]
        assert "新タイトル" in titles
        assert "元タイトル" not in titles

    async def test_get_diff(self, client: AsyncClient):
        # 元の投稿を承認
        post_res = await client.post(
            "/api/progressions", json=make_progression_payload(title="差分元")
        )
        original_id = post_res.json()["id"]
        await client.post(
            f"/api/admin/pending/{original_id}",
            json={"action": "approve"},
            params={"admin_password": "admin123"},
        )

        # 編集リクエスト
        edit_res = await client.post(
            f"/api/progressions/{original_id}/edit",
            json=make_progression_payload(title="差分後"),
        )
        edit_id = edit_res.json()["id"]

        response = await client.get(
            f"/api/admin/pending/{edit_id}/diff",
            params={"admin_password": "admin123"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["original"]["title"] == "差分元"
        assert body["updated"]["title"] == "差分後"

    async def test_invalid_action_returns_400(self, client: AsyncClient):
        post_res = await client.post(
            "/api/progressions", json=make_progression_payload()
        )
        progression_id = post_res.json()["id"]

        response = await client.post(
            f"/api/admin/pending/{progression_id}",
            json={"action": "invalid"},
            params={"admin_password": "admin123"},
        )
        assert response.status_code == 400


class TestAdminBlockedIPs:
    async def test_block_ip(self, client: AsyncClient):
        response = await client.post(
            "/api/admin/blocked-ips",
            json={"ip_address": "192.168.1.100", "reason": "スパム"},
            params={"admin_password": "admin123"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["ip_address"] == "192.168.1.100"
        assert body["reason"] == "スパム"

    async def test_block_duplicate_ip_returns_400(self, client: AsyncClient):
        await client.post(
            "/api/admin/blocked-ips",
            json={"ip_address": "192.168.1.200"},
            params={"admin_password": "admin123"},
        )
        response = await client.post(
            "/api/admin/blocked-ips",
            json={"ip_address": "192.168.1.200"},
            params={"admin_password": "admin123"},
        )
        assert response.status_code == 400

    async def test_get_blocked_ips(self, client: AsyncClient):
        await client.post(
            "/api/admin/blocked-ips",
            json={"ip_address": "10.0.0.1"},
            params={"admin_password": "admin123"},
        )

        response = await client.get(
            "/api/admin/blocked-ips", params={"admin_password": "admin123"}
        )
        assert response.status_code == 200
        ips = [b["ip_address"] for b in response.json()]
        assert "10.0.0.1" in ips

    async def test_unblock_ip(self, client: AsyncClient):
        block_res = await client.post(
            "/api/admin/blocked-ips",
            json={"ip_address": "10.0.0.2"},
            params={"admin_password": "admin123"},
        )
        ip_id = block_res.json()["id"]

        response = await client.delete(
            f"/api/admin/blocked-ips/{ip_id}",
            params={"admin_password": "admin123"},
        )
        assert response.status_code == 200

        # 削除後は一覧から消える
        list_res = await client.get(
            "/api/admin/blocked-ips", params={"admin_password": "admin123"}
        )
        ips = [b["ip_address"] for b in list_res.json()]
        assert "10.0.0.2" not in ips

    async def test_unblock_nonexistent_returns_404(self, client: AsyncClient):
        response = await client.delete(
            "/api/admin/blocked-ips/00000000-0000-0000-0000-000000000000",
            params={"admin_password": "admin123"},
        )
        assert response.status_code == 404


class TestAdminFeedbacks:
    async def test_get_feedbacks(self, client: AsyncClient):
        await client.post("/api/feedback", json={"content": "フィードバック1"})
        await client.post("/api/feedback", json={"content": "フィードバック2"})

        response = await client.get(
            "/api/admin/feedbacks", params={"admin_password": "admin123"}
        )
        assert response.status_code == 200
        contents = [f["content"] for f in response.json()]
        assert "フィードバック1" in contents
        assert "フィードバック2" in contents
