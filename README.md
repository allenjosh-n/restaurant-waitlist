# 🍴 Restaurant Waitlist Manager

A full-stack restaurant waitlist management system built with **FastAPI + PostgreSQL (Supabase) + React**.

> **PRJ-059** · Allen Joshua N · Reg No: 411723104005 · PSVPEC CSE

---

## Features

| Feature | Status |
|---|---|
| Token generation with validation | ✅ |
| Live queue tracking (auto-refresh 15s) | ✅ |
| Estimated wait time calculation | ✅ |
| Seat customer / No-show handling | ✅ |
| Smart seating suggestion | ✅ |
| Table status grid | ✅ |
| Analytics dashboard | ✅ |
| History log (seated + cancelled) | ✅ |
| CSV export of daily report | ✅ |
| Queue filter (name / phone / party size) | ✅ |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11) |
| Database | PostgreSQL via Supabase |
| Frontend | React 18 + Axios |
| Styling | Custom CSS (Inter + Plus Jakarta Sans) |
| Testing | pytest + httpx (async) |

---

## Project Structure

```
restaurant-waitlist/
├── backend/
│   ├── main.py            # FastAPI app — all routes
│   ├── schema.sql         # DB schema + sample data
│   ├── requirements.txt
│   ├── .env.example
│   └── tests/
│       └── test_api.py    # Full test suite (Week 1–3)
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js         # Main dashboard UI
        ├── App.css        # Component styles
        ├── api.js         # Axios API calls
        ├── index.css      # Global styles + CSS variables
        └── index.js
```

---

## Setup Instructions

### Prerequisites

| Tool | Version |
|---|---|
| Python | 3.11 |
| Node.js | 18+ |
| Supabase account | free tier works |

---

### 1. Database Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste contents of `backend/schema.sql` → **Run**
3. Go to **Settings → Database → Connection string (URI)** → copy the direct connection string

---

### 2. Backend Setup

```bash
# Create virtual environment with Python 3.11
py -3.11 -m venv venv311
source venv311/Scripts/activate   # Windows Git Bash
# or: venv311\Scripts\activate    # Windows CMD

# Install dependencies
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your Supabase connection string

# Start server
uvicorn main:app --reload
```

Backend runs at: **http://localhost:8000**  
API docs (Swagger): **http://localhost:8000/docs**

> **Note:** If on college WiFi, use a mobile hotspot — port 5432 is often blocked on institutional networks.

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

App runs at: **http://localhost:3000**

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/token` | Create waitlist token |
| `GET` | `/queue` | Live queue (waiting only) |
| `GET` | `/tables` | All table statuses |
| `DELETE` | `/token/{id}` | Remove token |
| `PATCH` | `/token/{id}/seat` | Mark as seated |
| `PATCH` | `/token/{id}/cancel` | Mark as no-show |
| `GET` | `/analytics` | Today's stats |
| `GET` | `/suggest-seating` | Smart seating suggestion |
| `GET` | `/history` | Today's seated + cancelled log |
| `GET` | `/export/csv` | Download daily report as CSV |

### POST /token — Request Body

```json
{
  "customer_name": "Arjun Sharma",
  "phone": "+91-9876543210",
  "party_size": 4
}
```

### Validation Rules

- `customer_name`: required, minimum 2 characters
- `phone`: required, minimum 10 digits
- `party_size`: minimum 1, maximum 20

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Supabase PostgreSQL URI | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres` |

---

## Running Tests

```bash
cd backend
pip install pytest httpx pytest-asyncio
pytest tests/ -v
```

Test coverage includes:
- Token creation (valid + invalid inputs)
- Queue fetch and field validation
- Table listing
- Delete, seat, cancel flows
- Analytics endpoint
- Suggest-seating logic
- History endpoint (Week 3)
- CSV export (Week 3)

---

## Weekly Deliverables

### Week 1 ✅
- PostgreSQL schema (`tokens`, `tables`, `queue`)
- Sample data (10 tables, 7 customers)
- FastAPI backend with core CRUD routes
- React dashboard with queue + tables view
- Form validation (name + phone)
- Auto-refresh every 15 seconds

### Week 2 ✅
- `/analytics` endpoint — today's stats
- `/cancel` — no-show handling with queue reorder
- `/suggest-seating` — smart helper (best table + best fit party)
- Queue filter by name, phone, party size
- Stats bar (in queue, tables free, occupied, max wait)
- Extended test suite

### Week 3 ✅
- Complete UI redesign — light theme, sidebar nav, two-column layout
- `/history` endpoint — today's seated + cancelled log
- `/export/csv` — download daily report as CSV
- History tab in frontend with table view
- CSV export button
- Seating rate progress bar in analytics
- Updated README + full test suite

---

## Sample Data

The schema includes:
- **10 dining tables** (2–8 seat capacity, mixed statuses)
- **7 sample customers** (5 waiting, 2 seated)

Run `backend/schema.sql` to populate your database.
