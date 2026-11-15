# Ver. Final - Budget Tracker Project Set-Up Guide

## Applications used:

Backend: Python with FastAPI framework  
Frontend: JavaScript with React  
Database: Supabase PostgreSQL  

## Software to Download:

Python 3.10+ is used to run the FastAPI backend with Uvicorn  
Node.js (LTS) is used run React frontend with npm

# Backend Setup (1st Terminal):

## 1. Setup and activate Virtual Environment to install packages
Setup:
py -m venv .venv (Windows)  
Or: python -m venv .venv (Windows)  
python3 -m venv .venv (MacOS / Linux)  

Activate:
venv\Scripts\activate.bat (CMD)  
.venv\Scripts\Activate.ps1 (PowerShell)  
source .venv/bin/activate (MacOS / Linux)  

**When activated, make sure the terminal displays (.venv).**

## 2. Install Python dependencies
py -m pip install -r requirements.txt (Windows)  
python -m pip install -r requirements.txt (Windows)  
python3 -m pip install -r requirements.txt (MacOS / Linux)  

## 3. Configure Supabase Connection
In project folder, create a new file called .env  
Inside .env, add:
DATABASE_URL=CONNECTION_STRING  
Replace CONNECTION_STRING with the connection string provided by the project administrator.  
Add the database connection string given by database project administrator  
### IMPORTANT:  
  1. Use connection string  
  2. Replace password placeholder with database password (already provided in the connection string)  
  3. Keep .env file private to your local computer  
  4. Don't share the database password or the connection string  
You can verify the database connection by running the following with Python virtual environment activated from the root directory:  
python -m JustinN_backend.test_connection  
python -m JustinN_backend.test_env

## 3. Start up FastAPI Backend
python -m uvicorn JustinN_backend.main:app --reload --port 8001 (Windows)  
py -m uvicorn JustinN_backend.main:app --reload --port 8001 (Windows)  
python3 -m uvicorn JustinN_backend.main:app --reload --port 8001 (MacOS / Linux)  

**Once started, backend is available at: http://127.0.0.1:8001/**

# Frontend Setup (2nd Terminal):

## 1. Navigate to frontend file and install npm
cd frontend  
npm install  

## 2. Start up Frontend
npm run dev  

**Once started, open up the URL given by npm.**

# Running Full Application:

## Terminal 1: 
From the project root (team-r09-09):  
  1. Activate venv  
  2. python -m uvicorn JustinN_backend.main:app --reload --port 8001 (Windows)  

## Terminal 2: 
From the project root (team-r09-09):  
  1. cd frontend  
  2. npm install  
  3. npm run dev  


