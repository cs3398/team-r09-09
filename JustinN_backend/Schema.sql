--For Python
--import sqlite3
--conn = sqlite3.connect('budget.db')
--conn.execute('PRAGMA foreign_keys = ON')
------------------------------------------------------------------
--For JavaScript
--const db = new Database('budget.db');
--db.pragma('foreign_keys = ON');

--App code needs to run above line when connecting to DB - Jason S

CREATE TABLE IF NOT EXISTS user_profile ( --Change if Not exists. DO NOT create new if user already exists - Jason S
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, --Password won't be hashed for demo 1 - Jason S
    creation_date TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    income INTEGER NOT NULL,
    expenses INTEGER NOT NULL,
    --amount DEC(10,2) --Change this to cents to avoid rounding error - Jason S
    category TEXT,
    date TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, --add check?
    UNIQUE (user_id, name, type)

);

CREATE TABLE IF NOT EXISTS budgets(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS budget_transactions(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    budget_limit INTEGER NOT NULL CHECK (budget_limit >= 0),
    UNIQUE (budget_id, category_id)
);

--add option for recourring expenses

--Maybe remove accounts table
--CREATE TABLE accounts (
    --id INTEGER PRIMARY KEY AUTOINCREMENT,
    --user_id INTEGER NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE, --user_profile(id) foreign Key. DELETE CASCADE - Jason S
   -- name TEXT NOT NULL,
    --password_hash NOT NULL --Encrypt 
--);



-- ============================================================
-- SAVINGS GOALS TRACKER
-- Added for The Night Owl Savings Goals feature.
-- ============================================================

-- Stores savings goals belonging to individual users.
CREATE TABLE IF NOT EXISTS savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Owner of the savings goal.
    user_id INTEGER NOT NULL
        REFERENCES user_profile(id) ON DELETE CASCADE,

    -- Name of the goal, such as "New Laptop".
    name TEXT NOT NULL,

    -- Amount the user wants to save.
    target_cents INTEGER NOT NULL CHECK (target_cents > 0),

    -- Total contributions allocated toward this goal.
    saved_cents INTEGER NOT NULL DEFAULT 0
        CHECK (saved_cents >= 0 AND saved_cents <= target_cents),

    -- Prevents awarding completion points more than once.
    reward_awarded INTEGER NOT NULL DEFAULT 0
        CHECK (reward_awarded IN (0, 1)),

    -- Date the savings goal was created.
    created_at TEXT DEFAULT (datetime('now'))
);


-- Records individual contributions toward savings goals.
-- These are tracked allocations, NOT actual expenses.
CREATE TABLE IF NOT EXISTS savings_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Goal receiving the contribution.
    goal_id INTEGER NOT NULL
        REFERENCES savings_goals(id) ON DELETE CASCADE,

    -- Contribution amount in cents.
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),

    -- Date the contribution was recorded.
    created_at TEXT DEFAULT (datetime('now'))
);


-- Stores Owl Points for each registered user.
CREATE TABLE IF NOT EXISTS owl_points (
    user_id INTEGER PRIMARY KEY
        REFERENCES user_profile(id) ON DELETE CASCADE,

    -- Current points available for rewards.
    balance INTEGER NOT NULL DEFAULT 150
        CHECK (balance >= 0)
);
