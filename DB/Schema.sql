--For Python
--import sqlite3
--conn = sqlite3.connect('budget.db')
--conn.execute('PRAGMA foreign_keys = ON')
------------------------------------------------------------------
--For JavaScript
--const db = new Database('budget.db');
--db.pragma('foreign_keys = ON');

--App code needs to run above line when connecting to DB - Jason S

CREATE TABLE user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    creation_date TEXT DEFAULT (datetime('now'))
);

CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE, --user_profile(id) foreign Key. DELETE CASCADE - Jason S
    name TEXT NOT NULL
);

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    --amount DEC(10,2) --Change this to cents to avoid rounding error - Jason S
    date TEXT DEFAULT (datetime('now'))
);