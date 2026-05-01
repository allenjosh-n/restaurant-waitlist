# 🍴 Restaurant Waitlist System — Week 1

A full-stack restaurant waitlist manager built with **FastAPI** + **PostgreSQL** + **React**.

---

## Project Structure

```
restaurant-waitlist/
├── backend/
│   ├── main.py          # FastAPI app + all routes
│   ├── schema.sql       # DB schema + sample data
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js       # Waitlist Dashboard UI
    │   ├── App.css
    │   ├── api.js       # Axios API calls
    │   ├── index.js
    │   └── index.css
    └── package.json
```

---

## Prerequisites

| Tool       | Version  |
|------------|----------|
| Python     | 3.10+    |
| Node.js    | 18+      |
| PostgreSQL | 14+ (or Supabase account) |

---

## 1. Database Setup

### Option A — Local PostgreSQL

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE waitlist_db;"

# Run the schema + seed data
psql -U postgres -d waitlist_db -f backend/schema.sql
```

### Option B — Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste the contents of `backend/schema.sql` → **Run**
3. Copy your connection string from **Settings → Database → Connection string (URI)**

---

## 2. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL to your PostgreSQL connection string

# Start the server
uvicorn main:app --reload
```

Server runs at: **http://localhost:8000**

Interactive API docs: **http://localhost:8000/docs**

---

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm start
```

App runs at: **http://localhost:3000**

> The `"proxy": "http://localhost:8000"` in `package.json` forwards API calls automatically.

---

## API Reference

| Method   | Endpoint              | Description                        |
|----------|-----------------------|------------------------------------|
| `GET`    | `/`                   | Health check                       |
| `POST`   | `/token`              | Create a new waitlist token        |
| `GET`    | `/queue`              | Get live queue (waiting customers) |
| `GET`    | `/tables`             | Get all table statuses             |
| `DELETE` | `/token/{id}`         | Remove a token from the waitlist   |
| `PATCH`  | `/token/{id}/seat`    | Mark customer as seated            |

### POST /token — Request Body

```json
{
  "customer_name": "Arjun Sharma",
  "phone": "+91-9876543210"
}
```

### Validation Rules

- `customer_name`: Required, minimum 2 characters
- `phone`: Required, minimum 10 digits

---

## Environment Variables

| Variable       | Description                          | Example                                       |
|----------------|--------------------------------------|-----------------------------------------------|
| `DATABASE_URL` | PostgreSQL connection string         | `postgresql://user:pass@localhost:5432/waitlist_db` |

---

## Running Tests

See `backend/tests/test_api.py` for automated test cases covering:

- Token creation (valid + invalid inputs)
- Queue fetching
- Token deletion
- Seat-a-customer flow

```bash
cd backend
pip install pytest httpx
pytest tests/ -v
```

---

## Week 1 Deliverables Checklist

- [x] PostgreSQL schema (`tokens`, `tables`, `queue`)
- [x] Sample data (10 tables, 7 customers)
- [x] FastAPI backend with all routes
- [x] Form validation (name + phone)
- [x] React Waitlist Dashboard
- [x] Live queue with seat/remove actions
- [x] Tables status grid
- [x] Auto-refresh every 15 seconds
- [x] Toast notifications
