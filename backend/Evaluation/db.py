"""
Database Connection Module
===========================
Manages PostgreSQL connection for the evaluation service.
Uses the parent directory's .env file for configuration.
"""

import os
import psycopg2
from dotenv import load_dotenv
from pathlib import Path

# Load .env from parent backend directory
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)
else:
    load_dotenv()  # fallback to local .env

_conn = None


def get_connection():
    """Get or create a database connection (singleton)."""
    global _conn
    
    if _conn is None or _conn.closed:
        _conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME", "skillbridge"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASS", ""),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432")
        )
        _conn.autocommit = True
        print("✅ Database connected")

    return _conn
