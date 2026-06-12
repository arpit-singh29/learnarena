from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json

from app.database import get_db
from app.models import QuizSession, Question, Answer, User
from app.schemas import QuizSubmitRequest, QuizSubmitResponse
from app.deps import get_current_user
from app.services import analytics_service

router = APIRouter(prefix="/quiz", tags=["Quiz"])


# ── START QUIZ ─────────────────────────────────────────────────
@router.post("/start/{course_id}")
def start_quiz(
    course_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    questions = db.query(Question).filter(
        Question.course_id == course_id
    ).all()

    if not questions:
        raise HTTPException(
            status_code=404,
            detail="No questions found for this course"
        )

    session = QuizSession(
        user_id=user.id,
        course_id=course_id,
        score=0,
        status="active"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Return questions WITHOUT correct_option (don't leak answers!)
    q_list = []
    for q in questions:
        q_list.append({
            "id":          q.id,
            "title":       q.title,
            "description": q.description,
            "options":     json.loads(q.options),
            "difficulty":  q.difficulty,
            "subject":     q.subject,
        })

    return {
        "quiz_session_id":  session.id,
        "course_id":        course_id,
        "total_questions":  len(questions),
        "questions":        q_list,
        "message":          "Quiz started — good luck!"
    }


# ── SUBMIT QUIZ ────────────────────────────────────────────────
@router.post("/submit", response_model=QuizSubmitResponse)
def submit_quiz(
    data: QuizSubmitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # 1. Validate session belongs to this user and is still active
    session = db.query(QuizSession).filter(
        QuizSession.id == data.quiz_session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found")

    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your quiz session")

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Quiz already submitted")

    # 2. Score each answer
    correct_count = 0
    wrong_count   = 0
    total_score   = 0
    total_time    = 0.0

    for submitted in data.answers:
        question = db.query(Question).filter(
            Question.id == submitted.question_id,
            Question.course_id == session.course_id   # must be from this course
        ).first()

        if not question:
            continue  # skip invalid question ids

        is_correct = (
            submitted.answer.strip().lower() ==
            question.correct_option.strip().lower()
        )

        # Score per difficulty
        if is_correct:
            if question.difficulty == "easy":
                pts = 5
            elif question.difficulty == "hard":
                pts = 20
            else:
                pts = 10   # medium (default)
            correct_count += 1
        else:
            pts = 0
            wrong_count += 1

        total_score += pts
        total_time  += submitted.time_taken_seconds

        ans = Answer(
            question_id=submitted.question_id,
            user_id=user.id,
            quiz_session_id=session.id,
            answer_text=submitted.answer,
            is_correct=is_correct,
            score=pts,
            time_taken_seconds=submitted.time_taken_seconds,
        )
        db.add(ans)

    # 3. Close the session
    session.score   = total_score
    session.status  = "completed"
    session.ended_at = datetime.now(timezone.utc)
    db.commit()

    # 4. Recalculate analytics (background-safe — runs in same request for now)
    analytics_service.recalculate(db, user.id)

    attempted = correct_count + wrong_count
    avg_time  = round(total_time / attempted, 2) if attempted else 0.0

    return QuizSubmitResponse(
        quiz_session_id=session.id,
        user_id=user.id,
        total_score=total_score,
        correct=correct_count,
        wrong=wrong_count,
        accuracy_pct=round((correct_count / attempted) * 100, 2) if attempted else 0.0,
        total_time_secs=round(total_time, 2),
        avg_time_secs=avg_time,
    )