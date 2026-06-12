from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.leaderboard_service import get_leaderboard

router = APIRouter()


@router.get("/leaderboard")
def leaderboard(db: Session = Depends(get_db)):
    return get_leaderboard(db)