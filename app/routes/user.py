from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.deps import get_current_user

router = APIRouter()


# ---------------- CURRENT USER ----------------
@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role
    }


# ---------------- DEBUG: ALL USERS ----------------
@router.get("/debug/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()

    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role
        }
        for u in users
    ]