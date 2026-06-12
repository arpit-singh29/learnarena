from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.deps import require_admin

from app.services import user_service

router = APIRouter()


# ---------------- ADMIN PANEL ----------------
@router.get("/admin")
def admin_panel(admin: User = Depends(require_admin)):
    return {
        "message": "Welcome Admin 🚀",
        "user": admin.username
    }


# ---------------- MAKE ADMIN (USING SERVICE LAYER) ----------------
@router.post("/make-admin/{user_id}")
def make_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):

    user = user_service.get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = user_service.make_user_admin(db, user)

    return {
        "message": f"{updated_user.username} is now admin"
    }