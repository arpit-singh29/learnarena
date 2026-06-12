from sqlalchemy.orm import Session
from app.models import User


def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def make_user_admin(db: Session, user: User):
    user.role = "admin"
    db.commit()
    db.refresh(user)
    return user