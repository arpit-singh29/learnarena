from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import QuestionCreate, AnswerCreate
from app.services import question_service
from app.services import analytics_service

router = APIRouter(tags=["Questions"])


@router.post("/questions")
def create_question(
    data: QuestionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
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
        data.subject,
    )


@router.get("/questions/{course_id}")
def get_questions(course_id: int, db: Session = Depends(get_db)):
    return question_service.get_questions(db, course_id)


@router.post("/answer")
def submit_answer(
    data: AnswerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    result = question_service.submit_answer(
        db,
        user.id,
        data.question_id,
        data.answer_text,
        data.time_taken_seconds,
    )

    if not result:
        raise HTTPException(status_code=404, detail="Question not found")

    # Recalculate analytics after every answer
    analytics_service.recalculate(db, user.id)

    return result