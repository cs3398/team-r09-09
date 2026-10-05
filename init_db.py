import sqlite3

conn = sqlite3.connect("budget.db")

conn.execute("PRAGMA foreign_keys = ON")

with open("DB/schema.sql") as f:
    conn.executescript(f.read())

conn.commit()
conn.close()

print("Database initialized successfully.")