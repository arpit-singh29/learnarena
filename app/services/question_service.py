import json
from sqlalchemy.orm import Session
from app.models import Question, Answer


def create_question(
    db: Session,
    title: str,
    description: str,
    course_id: int,
    user_id: int,
    options: list,
    correct_option: str,
    difficulty: str = "medium",
    subject: str = "General"
):
    q = Question(
        title=title,
        description=description,
        course_id=course_id,
        user_id=user_id,
        options=json.dumps(options),
        correct_option=correct_option,
        difficulty=difficulty,
        subject=subject,
    )
    db.add(q)
    db.commit()
    db.refresh(q)

    # Return with parsed options for the response
    q.options = json.loads(q.options)
    return q


def get_questions(db: Session, course_id: int):
    questions = db.query(Question).filter(
        Question.course_id == course_id
    ).all()

    for q in questions:
        q.options = json.loads(q.options)

    return questions


def submit_answer(
    db: Session,
    user_id: int,
    question_id: int,
    answer_text: str,
    time_taken_seconds: float = 0.0
):
    question = db.query(Question).filter(
        Question.id == question_id
    ).first()

    if not question:
        return None

    is_correct = (
        answer_text.strip().lower() ==
        question.correct_option.strip().lower()
    )

    # Difficulty-based scoring
    if is_correct:
        if question.difficulty == "easy":
            score = 5
        elif question.difficulty == "hard":
            score = 20
        else:
            score = 10
    else:
        score = 0

    ans = Answer(
        question_id=question_id,
        user_id=user_id,
        answer_text=answer_text,
        is_correct=is_correct,         # ✅ bool, not string
        score=score,
        time_taken_seconds=time_taken_seconds,
    )

    db.add(ans)
    db.commit()
    db.refresh(ans)

    return {
        "is_correct": is_correct,
        "score": score,
        "correct_option": question.correct_option,
        "time_taken_seconds": time_taken_seconds,
    }