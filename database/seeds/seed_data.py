"""
Seed script to create a demonstration researcher account.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.db.session import SessionLocal, init_db
from backend.app.models.user import User
from backend.app.core.security import get_password_hash

def seed():
    init_db()
    db = SessionLocal()
    try:
        demo_email = "researcher@neurovoice.org"
        existing = db.query(User).filter(User.email == demo_email).first()
        if not existing:
            demo_user = User(
                email=demo_email,
                hashed_password=get_password_hash("NeuroResearch2026!"),
                full_name="Dr. Alex Rivera (Lead Investigator)"
            )
            db.add(demo_user)
            db.commit()
            print(f"[+] Created demo researcher account: {demo_email}")
        else:
            print(f"[*] Demo account already exists: {demo_email}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()

