-- SPLIT//MAX Postgres Migration
-- All currency values are stored as BIGINT paise (1 INR = 100 paise)

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) NOT NULL DEFAULT '⚡',
    color VARCHAR(20) NOT NULL DEFAULT '#FF2E93',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) NOT NULL DEFAULT '🏖️',
    signature_color VARCHAR(20) NOT NULL DEFAULT '#FF7A00',
    accent_color VARCHAR(20) NOT NULL DEFAULT '#FFE600',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    display_name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) NOT NULL DEFAULT '👤',
    color VARCHAR(20) NOT NULL DEFAULT '#FFE600',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount_paise BIGINT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'food',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    split_method VARCHAR(20) NOT NULL DEFAULT 'equal',
    notes TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_payers (
    id TEXT PRIMARY KEY,
    expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
    amount_paise BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS expense_splits (
    id TEXT PRIMARY KEY,
    expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
    amount_paise BIGINT NOT NULL,
    share_value NUMERIC(10, 2)
);

CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_member TEXT NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
    to_member TEXT NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
    amount_paise BIGINT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    payload JSONB,
    actor TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for speedy querying by group
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_payers_expense_id ON expense_payers(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_activity_group_id_created ON activity(group_id, created_at DESC);
