import os
from dotenv import load_dotenv
from urllib.parse import urlsplit

load_dotenv(override=True)

url = os.getenv("DATABASE_URL")
parsed = urlsplit(url)

print("Hostname:", parsed.hostname)
print("Username:", parsed.username)
print("Port:", parsed.port)