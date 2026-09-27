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


CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    income INTEGER NOT NULL,
    expenses INTEGER NOT NULL
    --amount DEC(10,2) --Change this to cents to avoid rounding error - Jason S
    date TEXT DEFAULT (datetime('now'))
);

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, --add check?
    UNIQUE (user_id, name, type)


);

CREATE TABLE budgets(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    CHECK (end_date >= start_date)
);

CREATE TABLE budget_transactions(
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