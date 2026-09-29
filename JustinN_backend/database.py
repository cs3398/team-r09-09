# Imports the sqlite3 module to interact with SQLite database.
import sqlite3
from pathlib import Path

# start server here
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "budget.db"
SCHEMA_PATH = BASE_DIR / "Schema.sql"

# Defines a function to establish a connection to the SQLite database and enable foreign key support.
def get_connection():
    conn = sqlite3.connect(DB_PATH) #changed from "budget.db" to DB_PATH - JasonS
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn

#create tables - need this to run schema file from main.py
def init_db():
    conn = get_connection()
    conn.executescript(SCHEMA_PATH.read_text())
    conn.close