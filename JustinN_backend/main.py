# This backend application is built using FastAPI and serves as the backend for a budget tracker application. 
# It provides endpoints to retrieve users, accounts, and transactions from a database. The application is designed to be used with a React frontend, which can make requests to these endpoints using the fetch() API.
# For react, use fetch() to make requests to the backend endpoints. Example: fetch('http://localhost:8000/users').

from fastapi import FastAPI # Imports FastAPI framework to create the backend application.
from JustinN_backend.database import get_connection # Imports the get_connection function from the database module to establish a connection to the database.

# Creates fastapi app instance with title, description, and version.
app = FastAPI(title="Budget Tracker Backend", description="Backend for the Budget Tracker application", version="1.0.0")

# The following are GET endpoints defined to handle requests from the frontend and interact with the database.

# Defines a root endpoint that returns a message indicating that the backend is running.
@app.get("/")
def root():
    return {"message": "Budget Tracker Backend is running!"}

# Defines an endpoint to retrieve all users from the user_profile table in the database.
@app.get("/users")
def get_users():
    conn = get_connection()
    cursor = conn.execute("SELECT * FROM user_profile")
    users = cursor.fetchall()
    conn.close()
    return {"users": [dict(user) for user in users]}

# Defines an endpoint to retrieve all accounts associated with a specific user_id from the accounts table in the database.
@app.get("/accounts/{user_id}")
def get_accounts(user_id: int):
    conn = get_connection()
    cursor = conn.execute("SELECT * FROM accounts WHERE user_id = ?", (user_id,))
    accounts = cursor.fetchall()
    conn.close()
    return {"accounts": [dict(account) for account in accounts]}

# Defines an endpoint to retrieve all transactions associated with a specific account_id from the transactions table in the database.
@app.get("/transactions/{account_id}")
def get_transactions(account_id: int):
    conn = get_connection()
    cursor = conn.execute("SELECT * FROM transactions WHERE account_id = ?", (account_id,))
    transactions = cursor.fetchall()
    conn.close()
    return {"transactions": [dict(transaction) for transaction in transactions]}

def calculate_total_balance(user_id: int):
    conn = get_connection()
    cursor = conn.execute("SELECT SUM(balance) as total_balance FROM account WHERE user_id = ?", (user_id,))
    total_balance = cursor.fetchone()["total_balance"]
    conn.close()
    return total_balance

# The following are POST endpoints defined to handle requests from the frontend and interact with the database.


@app.post("/users")
def create_user(user: dict): 
    conn = get_connection()
    cursor = conn.execute("INSERT INTO user_profile (email) VALUES (?)", (user["email"],))
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return {"user_id": user_id}   

@app.post("/accounts")
def create_account(account: dict):  
    conn = get_connection()
    cursor = conn.execute("INSERT INTO accounts (user_id, name) VALUES (?, ?)", (account["user_id"], account["name"]))
    conn.commit()
    account_id = cursor.lastrowid
    conn.close()
    return {"account_id": account_id}

@app.post("/transactions")
def create_transaction(transaction: dict):  
    conn = get_connection()
    cursor = conn.execute("INSERT INTO transactions (account_id, description, amount, date) VALUES (?, ?, ?, ?)", (transaction["account_id"], transaction["description"], transaction["amount"], transaction["date"]))
    conn.commit()
    transaction_id = cursor.lastrowid
    conn.close()
    return {"transaction_id": transaction_id}



# Future endpoints are to be added later and will allow the frontend to perform CRUD operations on the database through the backend application.
