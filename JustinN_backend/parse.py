# This script prompts the user for their Supabase password, encodes it for safe use in a URL, and prints the encoded password.
from urllib.parse import quote
from getpass import getpass

# Prompt the user for their Supabase password
password = getpass("Enter your Supabase password: ")
# Encode the password for safe use in a URL
encoded_password = quote(password, safe="")
# Print the encoded password
print("Encoded password:", encoded_password)