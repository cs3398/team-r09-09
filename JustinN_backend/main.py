#version 1.1

# This backend application is built using FastAPI and serves as the backend for a budget tracker application. 
# It provides endpoints to retrieve users, accounts, and transactions from a database. The application is designed to be used with a React frontend, which can make requests to these endpoints using the fetch() API.
# For react, use fetch() to make requests to the backend endpoints. Example: fetch('http://localhost:8001/users').

import hashlib
from fastapi import FastAPI, HTTPException # Imports FastAPI framework to create the backend application. Imports HTTPException to handle exceptions and return appropriate HTTP responses.
from fastapi.middleware.cors import CORSMiddleware
from .database import get_connection

# Creates fastapi app instance with title, description, and version.
app = FastAPI(title="Budget Tracker Backend", description="Backend for the Budget Tracker application", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
    cursor = conn.execute("SELECT * FROM accounts WHERE user_id = %s", (user_id,))
    accounts = cursor.fetchall()
    conn.close()
    return {"accounts": [dict(account) for account in accounts]}

# Defines an endpoint to retrieve all transactions associated with a specific account_id from the transactions table in the database.
@app.get("/transactions/{account_id}")
def get_transactions(account_id: int):
    conn = get_connection()
    cursor = conn.execute("SELECT * FROM transactions WHERE account_id = %s", (account_id,))
    transactions = cursor.fetchall()
    conn.close()
    return {"transactions": [dict(transaction) for transaction in transactions]}

# Defines an endpoint to retrieve all categories associated with a specific user_id from the categories table in the database.
@app.get("/categories/{user_id}")
def get_categories(user_id: int):
    conn = get_connection()
    cursor = conn.execute("SELECT * FROM categories WHERE user_id = %s", (user_id,))
    categories = cursor.fetchall()
    conn.close()
    return {"categories": [dict(category) for category in categories]}

# Defines an endpoint to retrieve all budgets associated with a specific user_id from the budgets table in the database.
@app.get("/budgets/{user_id}")
def get_budgets(user_id: int):
    conn = get_connection()
    cursor = conn.execute("SELECT * FROM budgets WHERE user_id = %s", (user_id,))
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
        "INSERT INTO user_profile (email, password_hash) VALUES (%s, %s) RETURNING id",
        (user["email"], hashed_password)
    )
    conn.commit()
    user_id = cursor.fetchone()['id']
    conn.close()
    return {"user_id": user_id}   

# Defines an endpoint to create a new account in the accounts table in the database. It accepts a JSON payload containing the user_id and account name.
@app.post("/accounts")
def create_account(account: dict):  
    conn = get_connection()
    cursor = conn.execute("INSERT INTO accounts (user_id, name) VALUES (%s, %s) RETURNING id", (account["user_id"], account["name"]))
    conn.commit()
    account_id = cursor.fetchone()['id']
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
        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
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
    transaction_id = cursor.fetchone()['id']
    conn.close()

    return {"transaction_id": transaction_id}

# Defines an endpoint to create a new category in the categories table in the database. It accepts a JSON payload containing the user_id, name, and type of the category.
@app.post("/categories")
def create_category(category: dict):
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO categories (user_id, name, type) VALUES (%s, %s, %s) RETURNING id", (category["user_id"], category["name"], category["type"])
    )
    conn.commit()
    category_id = cursor.fetchone()['id']
    conn.close()
    return {"category_id": category_id}

# Defines an endpoint to create a new budget in the budgets table in the database. It accepts a JSON payload containing the user_id, category_id, and amount of the budget.
@app.post("/budgets")
def create_budget(budget: dict):
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO budgets (user_id, name, start_date, end_date) VALUES (%s, %s, %s, %s) RETURNING id", (budget["user_id"], budget["name"], budget["start_date"], budget["end_date"])
    )
    conn.commit()
    budget_id = cursor.fetchone()['id']
    conn.close()
    return {"budget_id": budget_id}

# Defines an endpoint to create a new expense in the transactions table in the database. It accepts a JSON payload containing the account_id, title, amount, and date.
@app.post("/expenses")
def create_expense(expense: dict):
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO transactions (account_id, description, amount, income, expenses, category, date) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
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
    expense_id = cursor.fetchone()['id']
    conn.close()
    return {"expense_id": expense_id}

#added login - Jason S
@app.post("/login")
def login(login: dict):
    conn = get_connection() #(login: dict):  is this right?
    hashed_password = hashlib.sha256(login["password"].encode('utf-8')).hexdigest()
    cursor = conn.execute("SELECT * FROM user_profile WHERE email=%s AND password_hash=%s",(login["email"], hashed_password),)
    user = cursor.fetchone()
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
    conn.execute("DELETE FROM user_profile WHERE id = %s", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "User deleted successfully."}

# Defines an endpoint to delete an account from the accounts table in the database. It accepts an account_id as a path parameter and deletes the corresponding account record.
@app.delete("/accounts/{account_id}")
def delete_account(account_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM accounts WHERE id = %s", (account_id,))
    conn.commit()
    conn.close()
    return {"message": "Account deleted successfully."}

# Defines an endpoint to delete a transaction from the transactions table in the database. It accepts a transaction_id as a path parameter and deletes the corresponding transaction record.
@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM transactions WHERE id = %s", (transaction_id,))
    conn.commit()
    conn.close()
    return {"message": "Transaction deleted successfully."}

# Defines an endpoint to delete a category from the categories table in the database. It accepts a category_id as a path parameter and deletes the corresponding category record.
@app.delete("/categories/{category_id}")
def delete_category(category_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM categories WHERE id = %s", (category_id,))
    conn.commit()
    conn.close()
    return {"message": "Category deleted successfully."}

# Defines an endpoint to delete a budget from the budgets table in the database. It accepts a budget_id as a path parameter and deletes the corresponding budget record.
@app.delete("/budgets/{budget_id}")
def delete_budget(budget_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM budgets WHERE id = %s", (budget_id,))
    conn.commit()
    conn.close()
    return {"message": "Budget deleted successfully."}

# Future endpoints are to be added later and will allow the frontend to perform CRUD operations on the database through the backend application.


# ============================================================
# SAVINGS GOALS TRACKER
# ============================================================

# Check that a user ID or amount is a positive whole number.
def valid_positive_int(value):
    return type(value) is int and value > 0


# Validate the information used to create or edit a goal.
def validate_goal(data):
    user_id = data.get("user_id")
    name = data.get("name")
    target = data.get("target_cents")

    if not valid_positive_int(user_id):
        raise HTTPException(400, "A valid user ID is required.")

    if not isinstance(name, str) or not name.strip():
        raise HTTPException(400, "Please enter a goal name.")

    if not valid_positive_int(target):
        raise HTTPException(400, "Target amount must be greater than zero.")

    return user_id, name.strip(), target


# Award 25 Owl Points only once per completed goal.
# Runs inside the same database transaction as the goal update.
def award_goal_points(conn, goal_id, user_id):
    rewarded = conn.execute(
        """
        UPDATE savings_goals
        SET reward_awarded = TRUE
        WHERE id = %s AND user_id = %s AND reward_awarded = FALSE
        RETURNING id
        """,
        (goal_id, user_id)
    ).fetchone()

    if not rewarded:
        return 0

    # Create the user's starting balance if needed.
    conn.execute(
        """
        INSERT INTO owl_points (user_id, balance)
        VALUES (%s, 150)
        ON CONFLICT (user_id) DO NOTHING
        """,
        (user_id,)
    )

    conn.execute(
        "UPDATE owl_points SET balance = balance + 25 WHERE user_id = %s",
        (user_id,)
    )

    return 25


# Retrieve a user's saved goals.
@app.get("/savings-goals/{user_id}")
def get_savings_goals(user_id: int):
    with get_connection() as conn:
        goals = conn.execute(
            """
            SELECT id, user_id, name, target_cents,
                   saved_cents, reward_awarded, created_at
            FROM savings_goals
            WHERE user_id = %s
            ORDER BY id DESC
            """,
            (user_id,)
        ).fetchall()

    return {"goals": goals}


# Create a savings goal with no money saved initially.
@app.post("/savings-goals")
def create_savings_goal(goal: dict):
    user_id, name, target = validate_goal(goal)

    with get_connection() as conn:
        user = conn.execute(
            "SELECT id FROM user_profile WHERE id = %s",
            (user_id,)
        ).fetchone()

        if not user:
            raise HTTPException(404, "User not found.")

        created = conn.execute(
            """
            INSERT INTO savings_goals (user_id, name, target_cents)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (user_id, name, target)
        ).fetchone()

    return {
        "goal_id": created["id"],
        "message": "Savings goal created successfully."
    }


# Edit a goal without removing its saved contributions.
@app.put("/savings-goals/{goal_id}")
def update_savings_goal(goal_id: int, update: dict):
    user_id, name, target = validate_goal(update)

    with get_connection() as conn:
        goal = conn.execute(
            """
            SELECT saved_cents, reward_awarded
            FROM savings_goals
            WHERE id = %s AND user_id = %s
            FOR UPDATE
            """,
            (goal_id, user_id)
        ).fetchone()

        if not goal:
            raise HTTPException(404, "Savings goal not found.")

        if target < goal["saved_cents"]:
            raise HTTPException(
                400, "Target cannot be lower than the amount already saved."
            )

        conn.execute(
            """
            UPDATE savings_goals
            SET name = %s, target_cents = %s
            WHERE id = %s AND user_id = %s
            """,
            (name, target, goal_id, user_id)
        )

        # Also reward completion if an edited target reaches 100%.
        if target == goal["saved_cents"] and not goal["reward_awarded"]:
            award_goal_points(conn, goal_id, user_id)

    return {"message": "Savings goal updated successfully."}


# Delete a goal and its contribution records.
@app.delete("/savings-goals/{goal_id}")
def delete_savings_goal(goal_id: int, user_id: int):
    if not valid_positive_int(user_id):
        raise HTTPException(400, "A valid user ID is required.")

    with get_connection() as conn:
        deleted = conn.execute(
            """
            DELETE FROM savings_goals
            WHERE id = %s AND user_id = %s
            RETURNING id
            """,
            (goal_id, user_id)
        ).fetchone()

        if not deleted:
            raise HTTPException(404, "Savings goal not found.")

    return {"message": "Savings goal deleted successfully."}


# ============================================================
# SAVINGS CONTRIBUTIONS
# ============================================================

# Add money to a goal and reward its first completion.
# Savings allocations are not recorded as expenses.
@app.post("/savings-goals/{goal_id}/contributions")
def add_savings_contribution(goal_id: int, contribution: dict):
    user_id = contribution.get("user_id")
    amount = contribution.get("amount_cents")

    if not valid_positive_int(user_id):
        raise HTTPException(400, "A valid user ID is required.")

    if not valid_positive_int(amount):
        raise HTTPException(400, "Contribution must be greater than zero.")

    with get_connection() as conn:
        # Lock the goal until the contribution is committed.
        goal = conn.execute(
            """
            SELECT target_cents, saved_cents, reward_awarded
            FROM savings_goals
            WHERE id = %s AND user_id = %s
            FOR UPDATE
            """,
            (goal_id, user_id)
        ).fetchone()

        if not goal:
            raise HTTPException(404, "Savings goal not found.")

        new_saved = goal["saved_cents"] + amount

        if new_saved > goal["target_cents"]:
            raise HTTPException(
                400, "Contribution exceeds the remaining goal amount."
            )

        # Save the contribution history.
        conn.execute(
            """
            INSERT INTO savings_contributions (goal_id, amount_cents)
            VALUES (%s, %s)
            """,
            (goal_id, amount)
        )

        # Update the goal's saved total.
        conn.execute(
            """
            UPDATE savings_goals
            SET saved_cents = %s
            WHERE id = %s AND user_id = %s
            """,
            (new_saved, goal_id, user_id)
        )

        points_earned = 0

        if new_saved == goal["target_cents"]:
            points_earned = award_goal_points(conn, goal_id, user_id)

    return {
        "message": "Savings contribution recorded successfully.",
        "saved_cents": new_saved,
        "points_earned": points_earned
    }


# ============================================================
# OWL POINTS
# ============================================================

# Retrieve the user's Owl Points balance.
# Users begin with 150 points.
@app.get("/owl-points/{user_id}")
def get_owl_points(user_id: int):
    with get_connection() as conn:
        user = conn.execute(
            "SELECT id FROM user_profile WHERE id = %s",
            (user_id,)
        ).fetchone()

        if not user:
            raise HTTPException(404, "User not found.")

        points = conn.execute(
            "SELECT balance FROM owl_points WHERE user_id = %s",
            (user_id,)
        ).fetchone()

    return {"balance": points["balance"] if points else 150}



# ============================================================
# VOUCHER REDEMPTIONS
# ============================================================

# Generates random demonstration voucher codes.
# These codes are for the class project, not real store discounts.
from secrets import choice

VOUCHER_COSTS = {
    "c1": 200,  # $5 Dining voucher
    "c2": 200,  # $5 Shopping voucher
    "c3": 450   # $10 Travel voucher
}


def generate_voucher_code():
    characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

    first = "".join(choice(characters) for _ in range(4))
    second = "".join(choice(characters) for _ in range(4))

    return f"OWL-{first}-{second}"


# Retrieve vouchers previously redeemed by a user.
# The frontend uses this to restore claimed vouchers after refreshing.
@app.get("/redeemed-vouchers/{user_id}")
def get_redeemed_vouchers(user_id: int):
    if not valid_positive_int(user_id):
        raise HTTPException(400, "A valid user ID is required.")

    with get_connection() as conn:
        vouchers = conn.execute(
            """
            SELECT coupon_id, voucher_code, points_spent, redeemed_at
            FROM redeemed_vouchers
            WHERE user_id = %s
            ORDER BY redeemed_at DESC
            """,
            (user_id,)
        ).fetchall()

    return {"vouchers": vouchers}


# Redeem a voucher and permanently deduct Owl Points.
# Both database changes succeed together or are rolled back.
@app.post("/redeemed-vouchers")
def redeem_voucher(redemption: dict):
    user_id = redemption.get("user_id")
    coupon_id = redemption.get("coupon_id")

    if not valid_positive_int(user_id):
        raise HTTPException(400, "A valid user ID is required.")

    # Only accept vouchers defined by the Rewards Hub.
    if coupon_id not in VOUCHER_COSTS:
        raise HTTPException(400, "Invalid voucher.")

    cost = VOUCHER_COSTS[coupon_id]

    with get_connection() as conn:

        # Create the user's initial Owl Points record if missing.
        # Also confirms the user exists through the foreign key.
        user = conn.execute(
            "SELECT id FROM user_profile WHERE id = %s",
            (user_id,)
        ).fetchone()

        if not user:
            raise HTTPException(404, "User not found.")

        conn.execute(
            """
            INSERT INTO owl_points (user_id, balance)
            VALUES (%s, 150)
            ON CONFLICT (user_id) DO NOTHING
            """,
            (user_id,)
        )

        # Lock the points balance to prevent overlapping redemptions.
        points = conn.execute(
            """
            SELECT balance
            FROM owl_points
            WHERE user_id = %s
            FOR UPDATE
            """,
            (user_id,)
        ).fetchone()

        # Prevent claiming the same voucher more than once.
        already_claimed = conn.execute(
            """
            SELECT id
            FROM redeemed_vouchers
            WHERE user_id = %s AND coupon_id = %s
            """,
            (user_id, coupon_id)
        ).fetchone()

        if already_claimed:
            raise HTTPException(409, "Voucher already redeemed.")

        if points["balance"] < cost:
            raise HTTPException(400, "Not enough Owl Points.")

        # Generate the demo code on the backend.
        code = generate_voucher_code()

        # Save the claim before deducting points.
        conn.execute(
            """
            INSERT INTO redeemed_vouchers
                (user_id, coupon_id, voucher_code, points_spent)
            VALUES (%s, %s, %s, %s)
            """,
            (user_id, coupon_id, code, cost)
        )

        # Permanently deduct the voucher's point cost.
        updated = conn.execute(
            """
            UPDATE owl_points
            SET balance = balance - %s
            WHERE user_id = %s
            RETURNING balance
            """,
            (cost, user_id)
        ).fetchone()

    return {
        "message": "Voucher redeemed successfully.",
        "coupon_id": coupon_id,
        "voucher_code": code,
        "points_spent": cost,
        "balance": updated["balance"]
    }
