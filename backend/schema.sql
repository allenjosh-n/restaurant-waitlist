-- ============================================================
-- Restaurant Waitlist Database Schema
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

-- 3. DINING TABLES ────────────────────────────────────────────
-- (Run once to set up the restaurant's physical tables)

INSERT INTO tables (table_number, capacity, status) VALUES
    (1,  2, 'available'),
    (2,  2, 'available'),
    (3,  4, 'available'),
    (4,  4, 'available'),
    (5,  4, 'available'),
    (6,  6, 'available'),
    (7,  6, 'available'),
    (8,  8, 'available'),
    (9,  2, 'available'),
    (10, 4, 'available')
ON CONFLICT DO NOTHING;
