-- ============================================================
-- Restaurant Waitlist Database Schema + Sample Data
-- Run this file in your PostgreSQL / Supabase SQL editor
-- ============================================================

-- 1. TABLES ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tokens (
    id            SERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    phone         VARCHAR(20)  NOT NULL,
    party_size    INT          NOT NULL DEFAULT 2,
    status        VARCHAR(20)  NOT NULL DEFAULT 'waiting'
                  CHECK (status IN ('waiting', 'seated', 'cancelled')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tables (
    id           SERIAL PRIMARY KEY,
    table_number INT         NOT NULL UNIQUE,
    capacity     INT         NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'available'
                 CHECK (status IN ('available', 'occupied', 'reserved'))
);

CREATE TABLE IF NOT EXISTS queue (
    id                  SERIAL PRIMARY KEY,
    token_id            INT  NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    position            INT  NOT NULL,
    estimated_wait_time INT  NOT NULL DEFAULT 0   -- in minutes
);

-- 2. INDEXES ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tokens_status   ON tokens(status);
CREATE INDEX IF NOT EXISTS idx_queue_position  ON queue(position);
CREATE INDEX IF NOT EXISTS idx_queue_token_id  ON queue(token_id);

-- 3. SAMPLE DATA ──────────────────────────────────────────────

-- Dining tables
INSERT INTO tables (table_number, capacity, status) VALUES
    (1,  2, 'occupied'),
    (2,  2, 'available'),
    (3,  4, 'occupied'),
    (4,  4, 'available'),
    (5,  4, 'reserved'),
    (6,  6, 'available'),
    (7,  6, 'occupied'),
    (8,  8, 'available'),
    (9,  2, 'available'),
    (10, 4, 'available')
ON CONFLICT DO NOTHING;

-- Waiting customers (tokens)
INSERT INTO tokens (customer_name, phone, party_size, status, created_at) VALUES
    ('Arjun Sharma',   '+91-9876543210', 2, 'waiting',  NOW() - INTERVAL '30 minutes'),
    ('Priya Nair',     '+91-9123456780', 4, 'waiting',  NOW() - INTERVAL '22 minutes'),
    ('Rahul Verma',    '+91-9988776655', 2, 'waiting',  NOW() - INTERVAL '15 minutes'),
    ('Sneha Pillai',   '+91-9345678901', 6, 'waiting',  NOW() - INTERVAL '10 minutes'),
    ('Karthik Menon',  '+91-9012345678', 3, 'waiting',  NOW() - INTERVAL '5 minutes'),
    ('Divya Krishnan', '+91-9765432109', 2, 'seated',   NOW() - INTERVAL '45 minutes'),
    ('Amit Patel',     '+91-9654321098', 4, 'seated',   NOW() - INTERVAL '50 minutes')
ON CONFLICT DO NOTHING;

-- Queue entries (only for 'waiting' tokens)
INSERT INTO queue (token_id, position, estimated_wait_time)
SELECT t.id,
       ROW_NUMBER() OVER (ORDER BY t.created_at) AS position,
       ROW_NUMBER() OVER (ORDER BY t.created_at) * 15 AS estimated_wait_time
FROM   tokens t
WHERE  t.status = 'waiting'
ON CONFLICT DO NOTHING;
