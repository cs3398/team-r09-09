# Imports the sqlite3 module to interact with SQLite database.
### import sqlite3: Old database

# Imports the os module to access environment variables.
import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(override=True)  

# Defines a function to establish a connection to the PostgreSQL database.
def get_connection():
    conn = psycopg.connect(os.getenv("DATABASE_URL"), row_factory=dict_row)
    return conn

