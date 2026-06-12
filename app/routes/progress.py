from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.deps import get_current_user
from app.schemas import ProgressResponse

from app.services import progress_service

router = APIRouter()


# ---------------- COMPLETE LESSON ----------------
@router.post("/complete-lesson/{lesson_id}")
def complete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):

    result = progress_service.complete_lesson(
        db=db,
        user_id=user.id,
        lesson_id=lesson_id
    )

    if not result:
        raise HTTPException(status_code=404, detail="Lesson not found")

    return {"message": "Lesson completed successfully"}


# ---------------- MY PROGRESS ----------------
@router.get("/my-progress", response_model=list[ProgressResponse])
def my_progress(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):

    return progress_service.get_user_progress(db, user.id)


# ---------------- COURSE PROGRESS PERCENTAGE ----------------
@router.get("/course-progress/{course_id}")
def course_progress(
    course_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):

    percentage = progress_service.get_course_progress(
        db=db,
        user_id=user.id,
        course_id=course_id
    )

    return {
        "user_id": user.id,
        "course_id": course_id,
        "progress_percentage": percentage
    }