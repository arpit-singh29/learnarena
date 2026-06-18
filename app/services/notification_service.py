# learnarena/app/services/notification_service.py

from sqlalchemy.orm import Session
from app.models import Notification


def create(db: Session, user_id: int, type: str, title: str, message: str, link: str = None):
    n = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        link=link,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


def get_for_user(db: Session, user_id: int, limit: int = 30):
    return db.query(Notification).filter(
        Notification.user_id == user_id
    ).order_by(Notification.created_at.desc()).limit(limit).all()


def get_unread_count(db: Session, user_id: int) -> int:
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).count()


def mark_all_read(db: Session, user_id: int):
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()


def mark_one_read(db: Session, notification_id: int, user_id: int):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    if n:
        n.is_read = True
        db.commit()
