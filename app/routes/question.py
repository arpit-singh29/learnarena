from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import User
from app.schemas import QuestionCreate, AnswerCreate
from app.services import question_service
from app.services import analytics_service

router = APIRouter(tags=["Questions"])


@router.post("/questions")
def create_question(
    data: QuestionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin)   # ✅ admin only now
):

    return question_service.create_question(
        db,
        data.title,
        data.description,
        data.course_id,
        user.id,
        data.options,
        data.correct_option,
        data.difficulty,
        data.subject
    )


@router.get("/questions/{course_id}")
def get_questions(
    course_id: int,
    db: Session = Depends(get_db)
):
    return question_service.get_questions(
        db,
        course_id
    )


@router.post("/answer")
def submit_answer(
    data: AnswerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)   # ✅ stays as-is — any logged-in user can ANSWER quiz questions
):

    result = question_service.submit_answer(
        db,
        user.id,
        data.question_id,
        data.answer_text,
        data.time_taken_seconds
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    analytics_service.recalculate(
        db,
        user.id
    )

    return result
