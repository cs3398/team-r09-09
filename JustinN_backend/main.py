#version 1.1

# This backend application is built using FastAPI and serves as the backend for a budget tracker application. 
# It provides endpoints to retrieve users, accounts, and transactions from a database. The application is designed to be used with a React frontend, which can make requests to these endpoints using the fetch() API.
# For react, use fetch() to make requests to the backend endpoints. Example: fetch('http://localhost:8001/users').

# The backend application uses a PostgreSQL database to store user, account, and transaction data. The database connection is established using the psycopg library, and the connection details are stored in environment variables for security.
from pydantic import BaseModel, Field
from datetime import date, timedelta

import hashlib
from fastapi import FastAPI, HTTPException # Imports FastAPI framework to create the backend application. Imports HTTPException to handle exceptions and return appropriate HTTP responses.
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()
from .database import get_connection

# Imports for plaid
import plaid
import os
from plaid.api import plaid_api
from pydantic import BaseModel
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.products import Products
#End plaid imports



# Creates fastapi app instance with title, description, and version.
app = FastAPI(title="Budget Tracker Backend", description="Backend for the Budget Tracker application", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Defines a Pydantic model for budget allocation, which includes category_id and budget_limit fields. The budget_limit field has a validation constraint to ensure it is greater than or equal to 0.
class BudgetAllocation(BaseModel):
    category_id: int
    budget_limit: int = Field(ge=0)

# Defines a Pydantic model for onboarding data, which includes user_id, monthly_income, monthly_budget, and allocations fields. The monthly_income and monthly_budget fields have validation constraints to ensure they are greater than or equal to 0. The allocations field is a list of BudgetAllocation objects.
class OnboardingData(BaseModel):
    user_id: int
    monthly_income: int = Field(ge=0)
    monthly_budget: int = Field(ge=0)
    allocations: list[BudgetAllocation]

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
        WHERE b.user_id = %s
        GROUP BY b.id, c.id
        """,
        (user_id,)
    )
    budget_summary = cursor.fetchall()
    conn.close()
    return {"budget_summary": [dict(summary) for summary in budget_summary]}

@app.get("/onboarding/{user_id}")
def get_onboarding(user_id: int):
    conn = get_connection()

    try:
        cursor = conn.execute(
            """
            SELECT
                u.id AS user_id,
                u.onboarding_completed,
                f.monthly_income
            FROM user_profile u
            LEFT JOIN financial_profiles f
                ON u.id = f.user_id
            WHERE u.id = %s
            """,
            (user_id,)
        )

        onboarding = cursor.fetchone()

        if onboarding is None:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        return dict(onboarding)

    finally:
        conn.close()

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
        "INSERT INTO categories (user_id, name, type) VALUES (%s, %s, %s) ON CONFLICT (user_id, name, type) DO UPDATE SET name = EXCLUDED.name RETURNING id", (category["user_id"], category["name"], category["type"])

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
        "INSERT INTO budgets (user_id, name, start_date, end_date, amount) VALUES (%s, %s, %s, %s, %s) RETURNING id", (budget["user_id"], budget["name"], budget["start_date"], budget["end_date"], budget["amount"])
    )
    budget_id = cursor.fetchone()['id']
    conn.commit()
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
    return {"user_id": user["id"], "email": user["email"], "onboarding_completed": user["onboarding_completed"]}

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

# Endpoint to create onboarding data for a user. Allows the frontend to send onboarding data, including monthly income, budget, and category allocations, to be saved in the database. Validates that the total allocated budget does not exceed the monthly budget and that there are no duplicate categories.
@app.post("/onboarding")
def create_onboarding(data: OnboardingData):
    total_allocated = sum(
        allocation.budget_limit for allocation in data.allocations
    )

    if total_allocated > data.monthly_budget:
        raise HTTPException(
            status_code=400,
            detail="Category allocations exceed the monthly budget."
        )

    category_ids = [allocation.category_id for allocation in data.allocations]

    if len(category_ids) != len(set(category_ids)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate categories are not allowed."
        )

    conn = get_connection()

    try:
        user = conn.execute(
            """
            SELECT id, onboarding_completed
            FROM user_profile
            WHERE id = %s
            FOR UPDATE
            """,
            (data.user_id,)
        ).fetchone()

        if user is None:
            raise HTTPException(status_code=404, detail="User not found.")

        if user["onboarding_completed"]:
            raise HTTPException(
                status_code=409,
                detail="Onboarding has already been completed."
            )

        for allocation in data.allocations:
            category = conn.execute(
                """
                SELECT id FROM categories
                WHERE id = %s AND user_id = %s
                """,
                (allocation.category_id, data.user_id)
            ).fetchone()

            if category is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid category: {allocation.category_id}"
                )

        conn.execute(
            """
            INSERT INTO financial_profiles (user_id, monthly_income)
            VALUES (%s, %s)
            ON CONFLICT (user_id)
            DO UPDATE SET monthly_income = EXCLUDED.monthly_income
            """,
            (data.user_id, data.monthly_income)
        )

        today = date.today()
        start_date = today.replace(day=1)

        if today.month == 12:
            next_month = date(today.year + 1, 1, 1)
        else:
            next_month = date(today.year, today.month + 1, 1)

        end_date = next_month - timedelta(days=1)

        cursor = conn.execute(
            """
            INSERT INTO budgets
                (user_id, name, start_date, end_date, amount)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                data.user_id,
                "Monthly Budget",
                start_date.isoformat(),
                end_date.isoformat(),
                data.monthly_budget
            )
        )

        budget_id = cursor.fetchone()["id"]

        for allocation in data.allocations:
            conn.execute(
                """
                INSERT INTO budget_transactions
                    (budget_id, category_id, budget_limit)
                VALUES (%s, %s, %s)
                """,
                (
                    budget_id,
                    allocation.category_id,
                    allocation.budget_limit
                )
            )

        conn.execute(
            """
            UPDATE user_profile
            SET onboarding_completed = TRUE
            WHERE id = %s
            """,
            (data.user_id,)
        )

        conn.commit()

        return {
            "message": "Onboarding completed successfully!",
            "budget_id": budget_id
        }

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()

# Endpoint to update a budget transaction's budget limit. Allows the frontend to send a new budget limit for a specific budget_transaction_id to be updated in the database. Validates that the new budget limit is a nonnegative integer and that the budget transaction exists.
@app.put("/budget_transactions/{budget_transaction_id}")
def update_budget_transaction(budget_transaction_id: int, budget_transaction: dict):
    conn = get_connection()

    try:
        budget_limit = budget_transaction["budget_limit"]

        if type(budget_limit) is not int or budget_limit < 0:
            raise HTTPException(
                status_code=400,
                detail="Budget limit must be a nonnegative integer."
            )

        cursor = conn.execute(
            """
            UPDATE budget_transactions
            SET budget_limit = %s
            WHERE id = %s
            RETURNING id
            """,
            (budget_limit, budget_transaction_id)
        )

        updated_budget_transaction = cursor.fetchone()

        if updated_budget_transaction is None:
            raise HTTPException(
                status_code=404,
                detail="Budget transaction not found."
            )

        conn.commit()

        return {"message": "Budget transaction updated successfully!"}

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()

# Endpoint to update a budget's amount. Allows the frontend to send a new budget amount for a specific budget_id to be updated in the database. Validates that the new amount is a nonnegative integer and that the budget exists.
@app.put("/budgets/{budget_id}")
def update_budget(budget_id: int, budget: dict):
    conn = get_connection()

    try:
        amount = budget["amount"]

        if type(amount) is not int or amount < 0:
            raise HTTPException(
                status_code=400,
                detail="Budget amount must be a nonnegative integer."
            )

        cursor = conn.execute(
            """
            UPDATE budgets
            SET amount = %s
            WHERE id = %s
            RETURNING id
            """,
            (amount, budget_id)
        )

        updated_budget = cursor.fetchone()

        if updated_budget is None:
            raise HTTPException(
                status_code=404,
                detail="Budget not found."
            )

        conn.commit()

        return {"message": "Budget updated successfully!"}

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()

# Endpoint to update a financial profile's monthly income. Allows the frontend to send a new monthly income for a specific user_id to be updated in the database. Validates that the new monthly income is a nonnegative integer and that the financial profile exists.
@app.put("/financial_profiles/{user_id}")
def update_financial_profile(user_id: int, profile: dict):
    conn = get_connection()

    cursor = conn.execute(
        """
        UPDATE financial_profiles
        SET monthly_income = %s
        WHERE user_id = %s
        RETURNING id
        """,
        (profile["monthly_income"], user_id)
    )

    updated_profile = cursor.fetchone()
    conn.commit()
    conn.close()

    if updated_profile is None:
        raise HTTPException(status_code=404, detail="Financial profile not found.")

    return {"message": "Financial profile updated successfully!"}

#Connect to Plaid Sandbox
config=plaid.Configuration(host=plaid.Environment.Sandbox,
                          api_key = {"clientId": os.environ["PLAID_CLIENT_ID"], "secret":os.environ["PLAID_SECRET"]})
client = plaid_api.PlaidApi(plaid.ApiClient(config))
access_token = None 
class PublicToken(BaseModel):
    public_token: str


#link token for react fronten
@app.post("/api/create_link_token")
def create_link_token():
    res=client.link_token_create(LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id="user1"), #replace with real user id
        client_name="Budget Tracker",
        products = [Products("transactions")],
        country_codes = [CountryCode("US")],
        language="en",
    ))

    return {"link_token": res["link_token"]}

# exchange for permanent tokeen
@app.post("/api/exchange_public_token")
def exchange_public_token(body: PublicToken):
    global access_token
    res = client.item_public_token_exchange(
        ItemPublicTokenExchangeRequest(public_token = body.public_token)
    )
    access_token = res["access_token"]
    return{"ok": True}

#convert plaid categories to ours
#FULL TAXONOMOY here: https://plaid.com/docs/transactions/pfc-migration/
Categories = {
    "ENTERTAINMENT": "Lifestyle & Emergency",
    "OTHER": "Lifestyle & Emergency",
    "MEDICAL": "Lifestyle & Emergency",
    "PERSONAL_CARE": "Lifestyle & Emergency",
    "FOOD_AND_DRINK": "Dining & Night Bites",
    "TRANSPORTATION": "Transportation & Travel",
    "TRAVEL": "Transportation & Travel",
    "RENT_AND_UTILITIES": "Housing & Utilities",
}

class ImportBody(BaseModel):
    account_id: int

#access transactions
@app.post("/api/import_transactions")
def Import_transactions(body: ImportBody):
    if access_token is None:
        raise HTTPException(status_code=400, detail="Bank not found")
    #not defined?
    res = client.transactions_sync(TransactionsSyncRequest(access_token=access_token))
    conn = get_connection()
    imported=0

    for t in res.to_dict()["added"]:
        if t in res.to_dict()["added"]:
            if t["amount"] <= 0:
                continue
        cents = round(t["amount"]*100)
        date = str(t["date"])
        pfc = t.get("personal_finance_category") or {}
        detailed = pfc.get("detailed") or ""

        if "EDUCATION" in detailed or "STUDENT_LOAN" in detailed:
            category = "Tuition & Fees"
        else:
            category = Categories.get(pfc.get("primary"), "Lifestyle & Emergency")

       #add checks for duplicates/invalid later
        exists = conn.execute("SELECT 1 FROM transactions WHERE account_id=%s AND description=%s AND amount=%s AND date=%s",
           (body.account_id, t["name"], cents, date),
       ).fetchone()
        if exists:
            continue

        conn.execute("Insert INTO transactions (account_id, description, amount, income, expenses, category, date) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (body.account_id, t["name"], cents, 0, cents, category, date),
       )
        imported +=1

    conn.commit()
    conn.close()
    return{"imported": imported}

# Future endpoints are to be added later and will allow the frontend to perform CRUD operations on the database through the backend application.

