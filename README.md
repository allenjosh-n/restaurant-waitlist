# 🍴 Restaurant Waitlist Manager

A full-stack restaurant waitlist management system — add walk-in customers to a live queue, manage table statuses, seat or mark no-shows, and track daily analytics, all from a single dashboard.

**Live Demo → [restaurant-waitlist-iota.vercel.app](https://restaurant-waitlist-iota.vercel.app)**  
**API Docs → [restaurant-waitlist-nv21.onrender.com/docs](https://restaurant-waitlist-nv21.onrender.com/docs)**

---

## Features

- **Waitlist tokens** — add customers with name, phone, and party size; auto-assigns queue position and estimated wait time
- **Live queue** — real-time view with 15-second auto-refresh; search by name, phone, or party size
- **Seat / No-show / Remove** — one-click actions that update the queue and free up tables automatically
- **Smart seating suggestion** — finds the best available table for the next fitting party
- **Table management** — mark tables as available, occupied, or reserved; free all occupied tables at once
- **Analytics dashboard** — today's totals (waiting, seated, no-shows) with a seating rate progress bar
- **History log** — filterable view of today's seated and cancelled customers
- **CSV export** — download the daily report as a timestamped CSV file

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11) + asyncpg |
| Database | PostgreSQL via Supabase |
| Frontend | React 18 + Axios |
| Styling | Custom CSS (Inter + Plus Jakarta Sans) |
| Hosting | Render (API) + Vercel (Frontend) |

---

## Project Structure

```
restaurant-waitlist/
├── backend/
│   ├── main.py            # FastAPI application — all routes and logic
│   ├── schema.sql         # Database schema + seed data (run once in Supabase)
│   ├── requirements.txt   # Python dependencies
│   ├── .env.example       # Environment variable template
│   └── tests/
│       └── test_api.py    # Full async test suite (pytest + httpx)
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js         # Main dashboard — all UI components
│       ├── App.css        # Component styles
│       ├── api.js         # Axios API client
│       ├── index.css      # Global styles and CSS variables
│       └── index.js       # React entry point
├── render.yaml            # Render deployment config
└── .gitignore
```

---

## Getting Started

### Prerequisites

- Python 3.11
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)

---

### 1. Database Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor**, paste the contents of `backend/schema.sql`, and click **Run**
3. Go to **Settings → Database → Connection string (URI)** and copy the direct connection URI

---

### 2. Backend

```bash
# Create a Python 3.11 virtual environment
py -3.11 -m venv venv311
venv311\Scripts\activate        # Windows CMD
# source venv311/Scripts/activate  # Windows Git Bash

# Install dependencies
cd backend
pip install -r requirements.txt

# Set up environment variables
copy .env.example .env
# Open .env and set DATABASE_URL to your Supabase connection string

# Start the API server
uvicorn main:app --reload
```

The API runs at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

---

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

The app runs at `http://localhost:3000`

> The frontend auto-detects the environment — it uses `localhost:8000` in development and the Render URL in production. To override, set `REACT_APP_API_URL` in a `.env.local` file.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/token` | Add a customer to the waitlist |
| `GET` | `/queue` | Fetch the live queue (waiting only) |
| `DELETE` | `/token/{id}` | Remove a token |
| `PATCH` | `/token/{id}/seat` | Mark customer as seated |
| `PATCH` | `/token/{id}/cancel` | Mark customer as no-show |
| `GET` | `/tables` | Fetch all table statuses |
| `PATCH` | `/tables/{id}/free` | Mark a table as available |
| `PATCH` | `/tables/{id}/reserve` | Mark a table as reserved |
| `PATCH` | `/tables/{id}/unreserve` | Unreserve a table |
| `PATCH` | `/tables/free-all` | Free all occupied tables |
| `GET` | `/analytics` | Today's stats |
| `GET` | `/suggest-seating` | Smart seating recommendation |
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

**Validation rules:**
- `customer_name` — required, minimum 2 characters
- `phone` — required, minimum 10 digits
- `party_size` — minimum 1, maximum 20

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection URI | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres` |

Copy `backend/.env.example` to `backend/.env` and fill in the value. Never commit the `.env` file.

---

## Running Tests

```bash
cd backend
pip install pytest httpx pytest-asyncio
pytest tests/ -v
```

The test suite covers token creation, queue operations, table management, seat/cancel/delete flows, analytics, smart seating suggestions, history, and CSV export.

---

## Deployment

### Backend (Render)

The `render.yaml` at the root configures the backend automatically. Connect your GitHub repo in the Render dashboard and add `DATABASE_URL` as an environment variable in the service settings.

### Frontend (Vercel)

Import the repository in the Vercel dashboard. Set the root directory to `frontend` and add:

```
REACT_APP_API_URL=https://your-render-service.onrender.com
```

Vercel will build and deploy on every push to `main`.

---

## License

MIT
