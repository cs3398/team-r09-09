#version 1.1

# This backend application is built using FastAPI and serves as the backend for a budget tracker application. 
# It provides endpoints to retrieve users, accounts, and transactions from a database. The application is designed to be used with a React frontend, which can make requests to these endpoints using the fetch() API.
# For react, use fetch() to make requests to the backend endpoints. Example: fetch('http://localhost:8001/users').

import hashlib
from fastapi import FastAPI, HTTPException # Imports FastAPI framework to create the backend application. Imports HTTPException to handle exceptions and return appropriate HTTP responses.
from fastapi.middleware.cors import CORSMiddleware
from database import get_connection, init_db

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
        VALUES (?, ?, ?, ?, ?, ?, ?)
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


# ============================================================
# SAVINGS GOALS TRACKER
# ============================================================

# Retrieves all savings goals belonging to a specific user.
# The frontend will call this endpoint when the Savings Goals
# page opens so previously saved goals can be displayed.
@app.get("/savings-goals/{user_id}")
def get_savings_goals(user_id: int):
    conn = get_connection()

    try:
        # Only retrieve goals associated with this user ID.
        goals = conn.execute(
            """
            SELECT id, user_id, name, target_cents,
                   saved_cents, reward_awarded, created_at
            FROM savings_goals
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (user_id,)
        ).fetchall()

        # Convert database rows into JSON-compatible dictionaries.
        return {"goals": [dict(goal) for goal in goals]}

    finally:
        # Always close the database connection.
        conn.close()


# Creates a new savings goal for a registered user.
# The goal begins with $0 saved and no completion reward.
@app.post("/savings-goals")
def create_savings_goal(goal: dict):
    # Retrieve and validate the information from React.
    user_id = goal.get("user_id")
    name = goal.get("name", "")
    target_cents = goal.get("target_cents")

    if not isinstance(user_id, int) or isinstance(user_id, bool):
        raise HTTPException(
            status_code=400,
            detail="A valid user ID is required."
        )

    if not isinstance(name, str) or not name.strip():
        raise HTTPException(
            status_code=400,
            detail="Please enter a goal name."
        )

    if (
        not isinstance(target_cents, int)
        or isinstance(target_cents, bool)
        or target_cents <= 0
    ):
        raise HTTPException(
            status_code=400,
            detail="Target amount must be greater than zero."
        )

    conn = get_connection()

    try:
        # Confirm that the user exists before creating the goal.
        user = conn.execute(
            "SELECT id FROM user_profile WHERE id = ?",
            (user_id,)
        ).fetchone()

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        # Save the new goal using integer cents.
        cursor = conn.execute(
            """
            INSERT INTO savings_goals
                (user_id, name, target_cents, saved_cents, reward_awarded)
            VALUES (?, ?, ?, 0, 0)
            """,
            (user_id, name.strip(), target_cents)
        )

        conn.commit()

        return {
            "goal_id": cursor.lastrowid,
            "message": "Savings goal created successfully."
        }

    finally:
        # Always close the database connection.
        conn.close()


# Updates the name or target amount of an existing savings goal.
# Contributions already saved toward the goal are preserved.
@app.put("/savings-goals/{goal_id}")
def update_savings_goal(goal_id: int, update: dict):
    user_id = update.get("user_id")
    name = update.get("name")
    target_cents = update.get("target_cents")

    # Validate the information submitted by the frontend.
    if not isinstance(user_id, int) or isinstance(user_id, bool):
        raise HTTPException(
            status_code=400,
            detail="A valid user ID is required."
        )

    if not isinstance(name, str) or not name.strip():
        raise HTTPException(
            status_code=400,
            detail="Please enter a goal name."
        )

    if (
        not isinstance(target_cents, int)
        or isinstance(target_cents, bool)
        or target_cents <= 0
    ):
        raise HTTPException(
            status_code=400,
            detail="Target amount must be greater than zero."
        )

    conn = get_connection()

    try:
        # Find the goal and verify that it belongs to this user.
        goal = conn.execute(
            """
            SELECT saved_cents
            FROM savings_goals
            WHERE id = ? AND user_id = ?
            """,
            (goal_id, user_id)
        ).fetchone()

        if goal is None:
            raise HTTPException(
                status_code=404,
                detail="Savings goal not found."
            )

        # Do not allow a new target below the already saved amount.
        if target_cents < goal["saved_cents"]:
            raise HTTPException(
                status_code=400,
                detail="Target cannot be lower than the amount already saved."
            )

        # Update only the name and target.
        conn.execute(
            """
            UPDATE savings_goals
            SET name = ?, target_cents = ?
            WHERE id = ? AND user_id = ?
            """,
            (name.strip(), target_cents, goal_id, user_id)
        )

        conn.commit()

        return {
            "message": "Savings goal updated successfully."
        }

    finally:
        conn.close()


# Deletes a savings goal belonging to the specified user.
# Associated contributions are automatically deleted because
# savings_contributions uses ON DELETE CASCADE.
@app.delete("/savings-goals/{goal_id}")
def delete_savings_goal(goal_id: int, user_id: int):
    conn = get_connection()

    try:
        # Verify that the goal exists and belongs to the user.
        goal = conn.execute(
            """
            SELECT id
            FROM savings_goals
            WHERE id = ? AND user_id = ?
            """,
            (goal_id, user_id)
        ).fetchone()

        if goal is None:
            raise HTTPException(
                status_code=404,
                detail="Savings goal not found."
            )

        # Delete the goal and its contribution history.
        conn.execute(
            """
            DELETE FROM savings_goals
            WHERE id = ? AND user_id = ?
            """,
            (goal_id, user_id)
        )

        conn.commit()

        return {
            "message": "Savings goal deleted successfully."
        }

    finally:
        conn.close()


# ============================================================
# SAVINGS CONTRIBUTIONS AND COMPLETION REWARDS
# ============================================================

# Adds savings toward a goal and awards 25 Owl Points
# when the goal is completed for the first time.
#
# Savings contributions are allocations, not expenses.
# They are stored separately from the transactions table.
@app.post("/savings-goals/{goal_id}/contributions")
def add_savings_contribution(goal_id: int, contribution: dict):

    user_id = contribution.get("user_id")
    amount_cents = contribution.get("amount_cents")

    # Validate the user ID.
    if not isinstance(user_id, int) or isinstance(user_id, bool):
        raise HTTPException(
            status_code=400,
            detail="A valid user ID is required."
        )

    # Contributions must be positive integer amounts in cents.
    if (
        not isinstance(amount_cents, int)
        or isinstance(amount_cents, bool)
        or amount_cents <= 0
    ):
        raise HTTPException(
            status_code=400,
            detail="Contribution must be greater than zero."
        )

    conn = get_connection()

    try:
        # Start a write transaction.
        # The contribution and any reward must succeed together.
        conn.execute("BEGIN IMMEDIATE")

        # Find the goal and verify that it belongs to the user.
        goal = conn.execute(
            """
            SELECT id, target_cents, saved_cents, reward_awarded
            FROM savings_goals
            WHERE id = ? AND user_id = ?
            """,
            (goal_id, user_id)
        ).fetchone()

        if goal is None:
            raise HTTPException(
                status_code=404,
                detail="Savings goal not found."
            )

        # Calculate the new savings balance.
        new_saved_cents = goal["saved_cents"] + amount_cents

        # Do not allow contributions beyond the goal's target.
        if new_saved_cents > goal["target_cents"]:
            raise HTTPException(
                status_code=400,
                detail="Contribution exceeds the remaining goal amount."
            )

        # Record the individual savings contribution.
        conn.execute(
            """
            INSERT INTO savings_contributions
                (goal_id, amount_cents)
            VALUES (?, ?)
            """,
            (goal_id, amount_cents)
        )

        # Update the total saved toward the goal.
        conn.execute(
            """
            UPDATE savings_goals
            SET saved_cents = ?
            WHERE id = ? AND user_id = ?
            """,
            (new_saved_cents, goal_id, user_id)
        )

        points_earned = 0

        # Check if the goal has reached 100% for the first time.
        if (
            new_saved_cents == goal["target_cents"]
            and goal["reward_awarded"] == 0
        ):

            # Create a points balance if the user does not have one.
            # The existing Dashboard starts users with 150 points.
            conn.execute(
                """
                INSERT OR IGNORE INTO owl_points
                    (user_id, balance)
                VALUES (?, 150)
                """,
                (user_id,)
            )

            # Award exactly 25 Owl Points.
            conn.execute(
                """
                UPDATE owl_points
                SET balance = balance + 25
                WHERE user_id = ?
                """,
                (user_id,)
            )

            # Mark the goal as already rewarded.
            # This prevents the same goal from awarding points again.
            conn.execute(
                """
                UPDATE savings_goals
                SET reward_awarded = 1
                WHERE id = ? AND user_id = ?
                """,
                (goal_id, user_id)
            )

            points_earned = 25

        # Save all database changes together.
        conn.commit()

        return {
            "message": "Savings contribution recorded successfully.",
            "saved_cents": new_saved_cents,
            "points_earned": points_earned
        }

    except Exception:
        # Undo all changes if any part of the operation fails.
        conn.rollback()
        raise

    finally:
        # Always close the database connection.
        conn.close()

# ============================================================
# OWL POINTS REWARDS
# ============================================================

# Retrieves a user's Owl Points balance from the database.
# Users begin with 150 points, matching the existing Dashboard.
@app.get("/owl-points/{user_id}")
def get_owl_points(user_id: int):
    conn = get_connection()

    try:
        # Check whether the user exists.
        user = conn.execute(
            "SELECT id FROM user_profile WHERE id = ?",
            (user_id,)
        ).fetchone()

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        # Retrieve the user's current points balance.
        points = conn.execute(
            "SELECT balance FROM owl_points WHERE user_id = ?",
            (user_id,)
        ).fetchone()

        # A user without a record starts with 150 Owl Points.
        balance = points["balance"] if points else 150

        return {"balance": balance}

    finally:
        conn.close()
