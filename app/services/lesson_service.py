from sqlalchemy.orm import Session
from app.models import Lesson, Enrollment


# ---------------- CREATE LESSON ----------------
def create_lesson(db: Session, title: str, content: str, course_id: int):
    lesson = Lesson(
        title=title,
        content=content,
        course_id=course_id
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


# ---------------- GET LESSONS ----------------
def get_lessons_by_course(db: Session, course_id: int):
    return db.query(Lesson).filter(Lesson.course_id == course_id).all()


# ---------------- CHECK ENROLLMENT ----------------
def is_user_enrolled(db: Session, user_id: int, course_id: int):
    return db.query(Enrollment).filter(
        Enrollment.user_id == user_id,
        Enrollment.course_id == course_id
    ).first() is not None