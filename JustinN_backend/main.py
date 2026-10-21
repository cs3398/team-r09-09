#version 1.1

# This backend application is built using FastAPI and serves as the backend for a budget tracker application. 
# It provides endpoints to retrieve users, accounts, and transactions from a database. The application is designed to be used with a React frontend, which can make requests to these endpoints using the fetch() API.
# For react, use fetch() to make requests to the backend endpoints. Example: fetch('http://localhost:8001/users').

import hashlib
from fastapi import FastAPI, HTTPException # Imports FastAPI framework to create the backend application. Imports HTTPException to handle exceptions and return appropriate HTTP responses.
from fastapi.middleware.cors import CORSMiddleware
from .database import get_connection, init_db

#call function to start db - Jason S
init_db()

# Creates fastapi app instance with title, description, and version.
app = FastAPI(title="Budget Tracker Backend", description="Backend for the Budget Tracker application", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

### The following are GET endpoints defined to handle requests from the frontend and interact with the database.

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

# Defines an endpoint to retrieve all categories associated with a specific user_id from the categories table in the database.
@app.get("/categories/{user_id}")
def get_categories(user_id: int):
    conn = get_connection()
    cursor = conn.execute("SELECT * FROM categories WHERE user_id = ?", (user_id,))
    categories = cursor.fetchall()
    conn.close()
    return {"categories": [dict(category) for category in categories]}

# Defines an endpoint to retrieve all budgets associated with a specific user_id from the budgets table in the database.
@app.get("/budgets/{user_id}")
def get_budgets(user_id: int):
    conn = get_connection()
    cursor = conn.execute("SELECT * FROM budgets WHERE user_id = ?", (user_id,))
    budgets = cursor.fetchall()
    conn.close()
    return {"budgets": [dict(budget) for budget in budgets]}

# Defines an endpoint to retrieve a summary of budgets, categories, and total spent for a specific user_id. 
# It joins the budgets, categories, and transactions tables to calculate the total amount spent in each category within the budget period.
# For now, purely skeletal. Will need to be updated to include the budget amount and the remaining balance for each budget.
@app.get("/budget_summary/{user_id}")
def get_budget_summary(user_id: int):
    conn = get_connection()
    cursor = conn.execute(
        """
        SELECT b.id as budget_id, b.name as budget_name, b.start_date, b.end_date,
               c.id as category_id, c.name as category_name, c.type as category_type,
               SUM(t.amount) as total_spent
        FROM budgets b
        JOIN categories c ON b.user_id = c.user_id
        LEFT JOIN transactions t ON c.id = t.category_id AND t.date BETWEEN b.start_date AND b.end_date
        WHERE b.user_id = ?
        GROUP BY b.id, c.id
        """,
        (user_id,)
    )
    budget_summary = cursor.fetchall()
    conn.close()
    return {"budget_summary": [dict(summary) for summary in budget_summary]}

### The following are POST endpoints defined to handle requests from the frontend and interact with the database.

# Defines an endpoint to create a new user in the user_profile table in the database. It accepts a JSON payload containing the user's email and password.
@app.post("/users")
def create_user(user: dict): 
    conn = get_connection()
   # Hash the plain-text password from the request body
    plain_password = user["password"]
    hashed_password = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()
    cursor = conn.execute(
        "INSERT INTO user_profile (email, password_hash) VALUES (?, ?)",
        (user["email"], hashed_password)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return {"user_id": user_id}   

# Defines an endpoint to create a new account in the accounts table in the database. It accepts a JSON payload containing the user_id and account name.
@app.post("/accounts")
def create_account(account: dict):  
    conn = get_connection()
    cursor = conn.execute("INSERT INTO accounts (user_id, name) VALUES (?, ?)", (account["user_id"], account["name"]))
    conn.commit()
    account_id = cursor.lastrowid
    conn.close()
    return {"account_id": account_id}

# Defines an endpoint to create a new transaction in the transactions table in the database. It accepts a JSON payload containing the account_id, description, amount, and date of the transaction.
@app.post("/transactions")
def create_transaction(transaction: dict):
    conn = get_connection()

    cursor = conn.execute(
        """
        INSERT INTO transactions
        (account_id, description, amount, income, expenses, category, date)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            transaction["account_id"],
            transaction["description"],
            transaction["amount"],
            0,
            transaction["amount"],
            transaction.get("category"),
            transaction["date"]
        )
    )

    conn.commit()
    transaction_id = cursor.lastrowid
    conn.close()

    return {"transaction_id": transaction_id}

# Defines an endpoint to create a new category in the categories table in the database. It accepts a JSON payload containing the user_id, name, and type of the category.
@app.post("/categories")
def create_category(category: dict):
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)", (category["user_id"], category["name"], category["type"])
    )
    conn.commit()
    category_id = cursor.lastrowid
    conn.close()
    return {"category_id": category_id}

# Defines an endpoint to create a new budget in the budgets table in the database. It accepts a JSON payload containing the user_id, category_id, and amount of the budget.
@app.post("/budgets")
def create_budget(budget: dict):
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO budgets (user_id, name, start_date, end_date) VALUES (?, ?, ?, ?)", (budget["user_id"], budget["name"], budget["start_date"], budget["end_date"])
    )
    conn.commit()
    budget_id = cursor.lastrowid
    conn.close()
    return {"budget_id": budget_id}

# Defines an endpoint to create a new expense in the transactions table in the database. It accepts a JSON payload containing the account_id, title, amount, and date.
@app.post("/expenses")
def create_expense(expense: dict):
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO transactions (account_id, description, amount, income, expenses, category, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            expense.get("account_id", 1),
            expense.get("title"),
            expense.get("amount"),
            0,
            expense.get("amount"),
            expense.get("category"),
            expense.get("date")  # Pulls the exact date sent by the frontend
        )
    )
    conn.commit()
    expense_id = cursor.lastrowid
    conn.close()
    return {"expense_id": expense_id}

#added login - Jason S
@app.post("/login")
def login(login: dict):
    conn = get_connection() #(login: dict):  is this right?
    hashed_password = hashlib.sha256(login["password"].encode('utf-8')).hexdigest()
    user = conn.execute("SELECT * FROM user_profile WHERE email=? AND password_hash=?",(login["email"], hashed_password),).fetchone()
    #conn.commit()
    conn.close()
    #send error if incorrecy -JasonS
    if user is None:
        raise HTTPException(status_code=401, detail="Incorrect Login")
    return {"user_id": user["id"], "email": user["email"]}

# Skeletal logout endpoint. Actual implementation will depend on how authentication is handled (e.g., sessions, tokens, etc.). For now, it simply returns a success message.
@app.post("/logout")
def logout():
    # Implement logout logic here (e.g., clear session, token, etc.)
    return {"message": "User logged out successfully."}

# Sekeletal endpoint to update a user's password. Actual implementation will depend on how authentication is handled (e.g., sessions, tokens, etc.). For now, it simply returns a success message.
@app.post("/update_password")
def update_password():
    # Implement password update logic here (e.g., verify current password, hash new password, update database, etc.)
    return {"message": "Password updated successfully."}

### The following are DELETE endpoints defined to handle requests from the frontend and interact with the database.

# Defines an endpoint to delete a user from the user_profile table in the database. It accepts a user_id as a path parameter and deletes the corresponding user record.
@app.delete("/users/{user_id}")
def delete_user(user_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM user_profile WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "User deleted successfully."}

# Defines an endpoint to delete an account from the accounts table in the database. It accepts an account_id as a path parameter and deletes the corresponding account record.
@app.delete("/accounts/{account_id}")
def delete_account(account_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
    conn.commit()
    conn.close()
    return {"message": "Account deleted successfully."}

# Defines an endpoint to delete a transaction from the transactions table in the database. It accepts a transaction_id as a path parameter and deletes the corresponding transaction record.
@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))
    conn.commit()
    conn.close()
    return {"message": "Transaction deleted successfully."}

# Defines an endpoint to delete a category from the categories table in the database. It accepts a category_id as a path parameter and deletes the corresponding category record.
@app.delete("/categories/{category_id}")
def delete_category(category_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    conn.commit()
    conn.close()
    return {"message": "Category deleted successfully."}

# Defines an endpoint to delete a budget from the budgets table in the database. It accepts a budget_id as a path parameter and deletes the corresponding budget record.
@app.delete("/budgets/{budget_id}")
def delete_budget(budget_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM budgets WHERE id = ?", (budget_id,))
    conn.commit()
    conn.close()
    return {"message": "Budget deleted successfully."}

# Future endpoints are to be added later and will allow the frontend to perform CRUD operations on the database through the backend application.
