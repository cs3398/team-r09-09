# Imports the sqlite3 module to interact with SQLite database.
import sqlite3

# Defines a function to establish a connection to the SQLite database and enable foreign key support.
def get_connection():
    conn = sqlite3.connect("budget.db")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn