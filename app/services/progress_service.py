from sqlalchemy.orm import Session
from app.models import Progress, Lesson


def complete_lesson(db: Session, user_id: int, lesson_id: int):

    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id
    ).first()

    if not lesson:
        return None

    existing = db.query(Progress).filter(
        Progress.user_id == user_id,
        Progress.lesson_id == lesson_id
    ).first()

    if existing:
        return existing

    progress = Progress(
        user_id=user_id,
        lesson_id=lesson_id,
        completed=True
    )

    db.add(progress)
    db.commit()
    db.refresh(progress)

    return progress


def get_user_progress(db: Session, user_id: int):
    return db.query(Progress).filter(
        Progress.user_id == user_id
    ).all()


def is_completed(db: Session, user_id: int, lesson_id: int):
    return db.query(Progress).filter(
        Progress.user_id == user_id,
        Progress.lesson_id == lesson_id
    ).first() is not None


def get_course_progress(
    db: Session,
    user_id: int,
    course_id: int
):

    total_lessons = db.query(Lesson).filter(
        Lesson.course_id == course_id
    ).count()

    if total_lessons == 0:
        return 0.0

    completed_lessons = db.query(Progress).join(
        Lesson,
        Progress.lesson_id == Lesson.id
    ).filter(
        Progress.user_id == user_id,
        Lesson.course_id == course_id,
        Progress.completed == True
    ).count()

    percentage = (
        completed_lessons / total_lessons
    ) * 100

    return round(percentage, 2)