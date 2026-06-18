# learnarena/app/routes/notifications.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    notifs = notification_service.get_for_user(db, user.id)
    return [
        {
            "id":         n.id,
            "type":       n.type,
            "title":      n.title,
            "message":    n.message,
            "link":       n.link,
            "is_read":    n.is_read,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifs
    ]


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    count = notification_service.get_unread_count(db, user.id)
    return {"count": count}


@router.post("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    notification_service.mark_all_read(db, user.id)
    return {"message": "All marked as read"}


@router.post("/{notification_id}/read")
def mark_one_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    notification_service.mark_one_read(db, notification_id, user.id)
    return {"message": "Marked as read"}
