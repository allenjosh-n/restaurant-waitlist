from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
import asyncpg
import os

app = FastAPI(title="Restaurant Waitlist API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/waitlist_db")

# ── Pydantic Models ──────────────────────────────────────────────────────────

class TokenCreate(BaseModel):
    customer_name: str
    phone: str

    @validator("customer_name")
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Customer name is required")
        if len(v.strip()) < 2:
            raise ValueError("Customer name must be at least 2 characters")
        return v.strip()

    @validator("phone")
    def phone_valid(cls, v):
        digits = "".join(filter(str.isdigit, v))
        if len(digits) < 10:
            raise ValueError("Phone number must have at least 10 digits")
        return v.strip()

class TokenResponse(BaseModel):
    id: int
    customer_name: str
    phone: str
    status: str
    created_at: datetime

class QueueEntry(BaseModel):
    queue_id: int
    position: int
    estimated_wait_time: int
    token_id: int
    customer_name: str
    phone: str
    status: str

class TableResponse(BaseModel):
    id: int
    table_number: int
    capacity: int
    status: str

# ── DB Connection Pool ───────────────────────────────────────────────────────

async def get_pool():
    return await asyncpg.create_pool(DATABASE_URL)

pool = None

@app.on_event("startup")
async def startup():
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL)

@app.on_event("shutdown")
async def shutdown():
    await pool.close()

# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Restaurant Waitlist API is running", "version": "1.0.0"}


@app.post("/token", response_model=TokenResponse, status_code=201)
async def create_token(token: TokenCreate):
    """Generate a new waitlist token for a customer."""
    async with pool.acquire() as conn:
        # Insert token
        row = await conn.fetchrow(
            """
            INSERT INTO tokens (customer_name, phone, status, created_at)
            VALUES ($1, $2, 'waiting', NOW())
            RETURNING id, customer_name, phone, status, created_at
            """,
            token.customer_name, token.phone
        )
        token_id = row["id"]

        # Calculate position and estimated wait
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM tokens WHERE status = 'waiting'"
        )
        position = count  # this token is now in the queue
        estimated_wait = position * 15  # 15 min per party

        await conn.execute(
            """
            INSERT INTO queue (token_id, position, estimated_wait_time)
            VALUES ($1, $2, $3)
            """,
            token_id, position, estimated_wait
        )

        return TokenResponse(**dict(row))


@app.get("/queue", response_model=List[QueueEntry])
async def get_queue():
    """Fetch the live waitlist queue."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT q.id AS queue_id, q.position, q.estimated_wait_time,
                   t.id AS token_id, t.customer_name, t.phone, t.status
            FROM queue q
            JOIN tokens t ON q.token_id = t.id
            WHERE t.status = 'waiting'
            ORDER BY q.position ASC
            """
        )
        return [QueueEntry(**dict(r)) for r in rows]


@app.get("/tables", response_model=List[TableResponse])
async def get_tables():
    """View current table statuses."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, table_number, capacity, status FROM tables ORDER BY table_number"
        )
        return [TableResponse(**dict(r)) for r in rows]


@app.delete("/token/{token_id}", status_code=204)
async def delete_token(token_id: int):
    """Remove a token from the waitlist."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM tokens WHERE id = $1", token_id
        )
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Token not found")
        await conn.execute(
            "DELETE FROM queue WHERE token_id = $1", token_id
        )
        # Reorder positions
        rows = await conn.fetch(
            "SELECT id FROM queue ORDER BY position"
        )
        for idx, row in enumerate(rows, start=1):
            await conn.execute(
                "UPDATE queue SET position = $1, estimated_wait_time = $2 WHERE id = $3",
                idx, idx * 15, row["id"]
            )


@app.patch("/token/{token_id}/seat", response_model=TokenResponse)
async def seat_customer(token_id: int):
    """Mark a customer as seated (removes from queue)."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE tokens SET status = 'seated'
            WHERE id = $1 RETURNING id, customer_name, phone, status, created_at
            """,
            token_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Token not found")
        await conn.execute("DELETE FROM queue WHERE token_id = $1", token_id)
        return TokenResponse(**dict(row))
