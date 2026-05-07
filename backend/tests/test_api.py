"""
Week 1 Test Suite — Restaurant Waitlist API
Run: pytest tests/ -v
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from main import app

# ── Helpers ──────────────────────────────────────────────────────────────────

def make_token_row(id=1, name="Test User", phone="9876543210",
                   status="waiting", party_size=2):
    from datetime import datetime
    row = {
        "id": id, "customer_name": name, "phone": phone, "party_size": party_size,
        "status": status, "created_at": datetime.utcnow()
    }
    return MagicMock(**row, **{"__getitem__": lambda s, k: row[k],
                               "items": lambda s: row.items(),
                               "keys": lambda s: row.keys()})


def make_queue_row(queue_id=1, position=1, wait=15,
                   token_id=1, name="Test User", phone="9876543210", party_size=2):
    row = {
        "queue_id": queue_id, "position": position,
        "estimated_wait_time": wait, "token_id": token_id,
        "customer_name": name, "phone": phone, "party_size": party_size, "status": "waiting"
    }
    return MagicMock(**row, **{"__getitem__": lambda s, k: row[k],
                               "items": lambda s: row.items(),
                               "keys": lambda s: row.keys()})


def make_table_row(id=1, number=1, cap=4, status="available"):
    row = {"id": id, "table_number": number, "capacity": cap, "status": status}
    return MagicMock(**row, **{"__getitem__": lambda s, k: row[k],
                               "items": lambda s: row.items(),
                               "keys": lambda s: row.keys()})


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_conn():
    conn = AsyncMock()
    conn.__aenter__ = AsyncMock(return_value=conn)
    conn.__aexit__ = AsyncMock(return_value=False)
    return conn


@pytest.fixture
def mock_pool(mock_conn):
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=mock_conn)
    return pool


# ── Tests: POST /token ────────────────────────────────────────────────────────

class TestCreateToken:

    @pytest.mark.asyncio
    async def test_create_token_success(self, mock_pool, mock_conn):
        mock_conn.fetchrow = AsyncMock(return_value=make_token_row())
        mock_conn.fetchval = AsyncMock(return_value=1)
        mock_conn.execute  = AsyncMock()

        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.post("/token", json={
                    "customer_name": "Arjun Sharma",
                    "phone": "9876543210"
                })
        assert res.status_code == 201
        body = res.json()
        assert body["customer_name"] == "Test User"
        assert body["status"] == "waiting"

    @pytest.mark.asyncio
    async def test_create_token_empty_name(self):
        async with AsyncClient(transport=ASGITransport(app=app),
                               base_url="http://test") as client:
            res = await client.post("/token", json={
                "customer_name": "",
                "phone": "9876543210"
            })
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_create_token_short_name(self):
        async with AsyncClient(transport=ASGITransport(app=app),
                               base_url="http://test") as client:
            res = await client.post("/token", json={
                "customer_name": "A",
                "phone": "9876543210"
            })
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_create_token_invalid_phone(self):
        async with AsyncClient(transport=ASGITransport(app=app),
                               base_url="http://test") as client:
            res = await client.post("/token", json={
                "customer_name": "Priya",
                "phone": "123"            # too short
            })
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_create_token_missing_fields(self):
        async with AsyncClient(transport=ASGITransport(app=app),
                               base_url="http://test") as client:
            res = await client.post("/token", json={})
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_create_token_phone_with_dashes(self, mock_pool, mock_conn):
        mock_conn.fetchrow = AsyncMock(return_value=make_token_row(
            phone="+91-9876543210"))
        mock_conn.fetchval = AsyncMock(return_value=1)
        mock_conn.execute  = AsyncMock()

        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.post("/token", json={
                    "customer_name": "Rahul",
                    "phone": "+91-9876543210"
                })
        assert res.status_code == 201


# ── Tests: GET /queue ─────────────────────────────────────────────────────────

class TestGetQueue:

    @pytest.mark.asyncio
    async def test_get_queue_returns_list(self, mock_pool, mock_conn):
        mock_conn.fetch = AsyncMock(return_value=[
            make_queue_row(queue_id=1, position=1, name="Arjun"),
            make_queue_row(queue_id=2, position=2, name="Priya"),
        ])
        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.get("/queue")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["position"] == 1

    @pytest.mark.asyncio
    async def test_get_queue_empty(self, mock_pool, mock_conn):
        mock_conn.fetch = AsyncMock(return_value=[])
        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.get("/queue")
        assert res.status_code == 200
        assert res.json() == []

    @pytest.mark.asyncio
    async def test_queue_fields_present(self, mock_pool, mock_conn):
        mock_conn.fetch = AsyncMock(return_value=[make_queue_row()])
        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.get("/queue")
        entry = res.json()[0]
        for field in ("queue_id", "position", "estimated_wait_time",
                      "token_id", "customer_name", "phone", "party_size", "status"):
            assert field in entry


# ── Tests: GET /tables ────────────────────────────────────────────────────────

class TestGetTables:

    @pytest.mark.asyncio
    async def test_get_tables_returns_list(self, mock_pool, mock_conn):
        mock_conn.fetch = AsyncMock(return_value=[
            make_table_row(id=1, number=1, status="available"),
            make_table_row(id=2, number=2, status="occupied"),
        ])
        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.get("/tables")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 2
        assert data[1]["status"] == "occupied"

    @pytest.mark.asyncio
    async def test_tables_fields_present(self, mock_pool, mock_conn):
        mock_conn.fetch = AsyncMock(return_value=[make_table_row()])
        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.get("/tables")
        t = res.json()[0]
        for field in ("id", "table_number", "capacity", "status"):
            assert field in t


# ── Tests: DELETE /token/{id} ─────────────────────────────────────────────────

class TestDeleteToken:

    @pytest.mark.asyncio
    async def test_delete_token_success(self, mock_pool, mock_conn):
        mock_conn.execute = AsyncMock(side_effect=["DELETE 1", None, None])
        mock_conn.fetch   = AsyncMock(return_value=[])
        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.delete("/token/1")
        assert res.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_nonexistent_token(self, mock_pool, mock_conn):
        mock_conn.execute = AsyncMock(return_value="DELETE 0")
        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.delete("/token/999")
        assert res.status_code == 404


# ── Tests: PATCH /token/{id}/seat ────────────────────────────────────────────

class TestSeatCustomer:

    @pytest.mark.asyncio
    async def test_seat_customer_success(self, mock_pool, mock_conn):
        mock_conn.fetchrow = AsyncMock(
            return_value=make_token_row(status="seated"))
        mock_conn.execute  = AsyncMock()
        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.patch("/token/1/seat")
        assert res.status_code == 200
        assert res.json()["status"] == "seated"

    @pytest.mark.asyncio
    async def test_seat_nonexistent_token(self, mock_pool, mock_conn):
        mock_conn.fetchrow = AsyncMock(return_value=None)
        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.patch("/token/999/seat")
        assert res.status_code == 404

# ── Tests: PATCH /token/{id}/cancel ──────────────────────────────────────────

class TestCancelCustomer:

    @pytest.mark.asyncio
    async def test_cancel_customer_success(self, mock_pool, mock_conn):
        mock_conn.fetchrow = AsyncMock(
            return_value=make_token_row(status="cancelled"))
        mock_conn.execute  = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=[])
        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.patch("/token/1/cancel")
        assert res.status_code == 200
        assert res.json()["status"] == "cancelled"


# ── Tests: GET /analytics ────────────────────────────────────────────────────

class TestGetAnalytics:

    @pytest.mark.asyncio
    async def test_get_analytics(self, mock_pool, mock_conn):
        mock_conn.fetch = AsyncMock(return_value=[
            {"status": "waiting", "count": 2},
            {"status": "seated", "count": 1}
        ])
        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.get("/analytics")
        assert res.status_code == 200
        data = res.json()
        assert data["total_waiting"] == 2
        assert data["total_seated"] == 1
        assert data["total_cancelled"] == 0
        assert data["total_today"] == 3


# ── Tests: GET /suggest-seating ──────────────────────────────────────────────

class TestSuggestSeating:

    @pytest.mark.asyncio
    async def test_suggest_seating_success(self, mock_pool, mock_conn):
        mock_conn.fetchrow = AsyncMock(side_effect=[
            {"id": 1, "table_number": 5, "capacity": 4},
            {"token_id": 2, "customer_name": "Test Party"}
        ])
        with patch("main.pool", mock_pool):
            async with AsyncClient(transport=ASGITransport(app=app),
                                   base_url="http://test") as client:
                res = await client.get("/suggest-seating")
        assert res.status_code == 200
        data = res.json()
        assert data["table_number"] == 5
        assert data["customer_name"] == "Test Party"

