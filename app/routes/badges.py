from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.services import badge_service

router = APIRouter(prefix="/badges", tags=["Badges"])


@router.get("/me")
def my_badges(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return badge_service.get_all_badges_for_user(db, user.id)


@router.get("/user/{user_id}")
def user_badges(user_id: int, db: Session = Depends(get_db)):
    return badge_service.get_all_badges_for_user(db, user_id)