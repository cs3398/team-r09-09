from database import get_connection

with get_connection() as conn:
    cursor = conn.execute("SELECT current_database()")
    result = cursor.fetchone()

    print("Connected successfully!")
    print("Database:", result["current_database"])