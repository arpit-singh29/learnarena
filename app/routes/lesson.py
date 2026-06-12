from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import LessonCreate, LessonResponse
from app.deps import get_current_user, require_admin

from app.services import lesson_service

router = APIRouter()


# ---------------- CREATE LESSON (ADMIN ONLY) ----------------
@router.post("/lessons", response_model=LessonResponse)
def create_lesson(
    lesson: LessonCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):

    return lesson_service.create_lesson(
        db=db,
        title=lesson.title,
        content=lesson.content,
        course_id=lesson.course_id
    )


# ---------------- GET LESSONS (ENROLLMENT REQUIRED) ----------------
@router.get("/lessons/{course_id}", response_model=list[LessonResponse])
def get_lessons(
    course_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):

    # 🔐 CHECK ENROLLMENT
    if not lesson_service.is_user_enrolled(db, user.id, course_id):
        raise HTTPException(
            status_code=403,
            detail="You must enroll in this course to view lessons"
        )

    return lesson_service.get_lessons_by_course(db, course_id)