from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
import asyncpg
import os
import csv
import io
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Restaurant Waitlist API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://restaurant-waitlist-nv21.onrender.com",
        "https://restaurant-waitlist-iota.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/waitlist_db")

# ── Pydantic Models ──────────────────────────────────────────────────────────

class TokenCreate(BaseModel):
    customer_name: str
    phone: str
    party_size: int = 2

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
    party_size: int
    status: str
    created_at: datetime

class QueueEntry(BaseModel):
    queue_id: int
    position: int
    estimated_wait_time: int
    token_id: int
    customer_name: str
    phone: str
    party_size: int
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
    # Use ssl="require" for direct connections, disable for pooler (SSL in URL)
    db_url = DATABASE_URL
    if "pooler.supabase.com" in db_url:
        pool = await asyncpg.create_pool(db_url)
    else:
        pool = await asyncpg.create_pool(db_url, ssl="require")

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
            INSERT INTO tokens (customer_name, phone, party_size, status, created_at)
            VALUES ($1, $2, $3, 'waiting', NOW())
            RETURNING id, customer_name, phone, party_size, status, created_at
            """,
            token.customer_name, token.phone, token.party_size
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
                   t.id AS token_id, t.customer_name, t.phone, t.party_size, t.status
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
            WHERE id = $1 RETURNING id, customer_name, phone, party_size, status, created_at
            """,
            token_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Token not found")
        await conn.execute("DELETE FROM queue WHERE token_id = $1", token_id)
        return TokenResponse(**dict(row))

@app.patch("/token/{token_id}/cancel", response_model=TokenResponse)
async def cancel_customer(token_id: int):
    """Mark a customer as cancelled (removes from queue)."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE tokens SET status = 'cancelled'
            WHERE id = $1 RETURNING id, customer_name, phone, party_size, status, created_at
            """,
            token_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Token not found")
        await conn.execute("DELETE FROM queue WHERE token_id = $1", token_id)
        # Reorder positions
        rows = await conn.fetch("SELECT id FROM queue ORDER BY position")
        for idx, r in enumerate(rows, start=1):
            await conn.execute(
                "UPDATE queue SET position = $1, estimated_wait_time = $2 WHERE id = $3",
                idx, idx * 15, r["id"]
            )
        return TokenResponse(**dict(row))

class AnalyticsResponse(BaseModel):
    total_waiting: int
    total_seated: int
    total_cancelled: int
    total_today: int

@app.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics():
    """Get today's analytics."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT status, COUNT(*) as count FROM tokens WHERE DATE(created_at) = CURRENT_DATE GROUP BY status"
        )
        stats = {"waiting": 0, "seated": 0, "cancelled": 0}
        for r in rows:
            stats[r["status"]] = r["count"]
        
        return AnalyticsResponse(
            total_waiting=stats["waiting"],
            total_seated=stats["seated"],
            total_cancelled=stats["cancelled"],
            total_today=stats["waiting"] + stats["seated"] + stats["cancelled"]
        )

class SuggestionResponse(BaseModel):
    table_id: Optional[int] = None
    table_number: Optional[int] = None
    token_id: Optional[int] = None
    customer_name: Optional[str] = None
    message: str

@app.get("/suggest-seating", response_model=SuggestionResponse)
async def suggest_seating():
    """Suggests the best queue entry for the largest available table."""
    async with pool.acquire() as conn:
        # Get the largest available table
        table = await conn.fetchrow(
            "SELECT id, table_number, capacity FROM tables WHERE status = 'available' ORDER BY capacity DESC LIMIT 1"
        )
        if not table:
            return SuggestionResponse(message="No tables available.")
            
        queue_entry = await conn.fetchrow(
            """
            SELECT q.token_id, t.customer_name
            FROM queue q
            JOIN tokens t ON q.token_id = t.id
            WHERE t.party_size <= $1
            ORDER BY q.position ASC
            LIMIT 1
            """,
            table["capacity"]
        )
        
        if not queue_entry:
            return SuggestionResponse(message=f"No waiting party fits the available table (Capacity: {table['capacity']}).")
            
        return SuggestionResponse(
            table_id=table["id"],
            table_number=table["table_number"],
            token_id=queue_entry["token_id"],
            customer_name=queue_entry["customer_name"],
            message=f"Suggest seating {queue_entry['customer_name']} at Table {table['table_number']}."
        )


# ── Week 3: History ──────────────────────────────────────────────────────────

class HistoryEntry(BaseModel):
    id: int
    customer_name: str
    phone: str
    party_size: int
    status: str
    created_at: datetime

@app.get("/history", response_model=List[HistoryEntry])
async def get_history():
    """Get today's seated and cancelled customers (history log)."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, customer_name, phone, party_size, status, created_at
            FROM tokens
            WHERE status IN ('seated', 'cancelled')
              AND DATE(created_at) = CURRENT_DATE
            ORDER BY created_at DESC
            """
        )
        return [HistoryEntry(**dict(r)) for r in rows]


# ── Week 3: CSV Export ───────────────────────────────────────────────────────

@app.get("/export/csv")
async def export_csv():
    """Export today's full token history as a CSV file."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, customer_name, phone, party_size, status,
                   TO_CHAR(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') AS created_at
            FROM tokens
            WHERE DATE(created_at) = CURRENT_DATE
            ORDER BY created_at ASC
            """
        )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Token ID", "Customer Name", "Phone", "Party Size", "Status", "Created At (IST)"])
    for r in rows:
        writer.writerow([r["id"], r["customer_name"], r["phone"],
                         r["party_size"], r["status"], r["created_at"]])

    output.seek(0)
    filename = f"waitlist_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
