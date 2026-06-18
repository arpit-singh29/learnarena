"""
challenge_service.py
────────────────────
Handles challenge creation, submission and ELO updates.

ELO formula (standard chess):
  expected = 1 / (1 + 10^((opponent_rating - my_rating) / 400))
  new_rating = old_rating + K * (actual - expected)
  K = 32 (standard)
"""
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import Challenge, Question, Answer, EloRating, User


K_FACTOR = 32


# ── ELO helpers ───────────────────────────────────────────────
def _get_or_create_elo(db: Session, user_id: int) -> EloRating:
    elo = db.query(EloRating).filter(EloRating.user_id == user_id).first()
    if not elo:
        elo = EloRating(user_id=user_id, rating=1000)
        db.add(elo)
        db.commit()
        db.refresh(elo)
    return elo


def _elo_rank(rating: int) -> str:
    if rating >= 2000: return "Diamond"
    if rating >= 1600: return "Platinum"
    if rating >= 1300: return "Gold"
    if rating >= 1100: return "Silver"
    return "Bronze"


def _update_elo(db: Session, winner_id: int, loser_id: int, draw: bool = False):
    w = _get_or_create_elo(db, winner_id)
    l = _get_or_create_elo(db, loser_id)

    expected_w = 1 / (1 + 10 ** ((l.rating - w.rating) / 400))
    expected_l = 1 - expected_w

    if draw:
        actual_w = actual_l = 0.5
        w.draws += 1
        l.draws += 1
    else:
        actual_w, actual_l = 1.0, 0.0
        w.wins   += 1
        l.losses += 1

    w_change = round(K_FACTOR * (actual_w - expected_w))
    l_change = round(K_FACTOR * (actual_l - expected_l))

    w.rating = max(100, w.rating + w_change)
    l.rating = max(100, l.rating + l_change)

    db.commit()
    return w_change, l_change


# ── Public API ────────────────────────────────────────────────
def create_challenge(
    db: Session,
    challenger_id: int,
    opponent_id: int,
    course_id: int,
    mode: str,
    question_count: int
) -> Challenge:
    c = Challenge(
        challenger_id=challenger_id,
        opponent_id=opponent_id,
        course_id=course_id,
        mode=mode,
        question_count=question_count,
        status="pending"
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def get_challenge_questions(db: Session, challenge: Challenge):
    """Return question_count random questions from the course."""
    questions = db.query(Question).filter(
        Question.course_id == challenge.course_id
    ).limit(challenge.question_count).all()

    return [
        {
            "id":          q.id,
            "title":       q.title,
            "description": q.description,
            "options":     json.loads(q.options),
            "difficulty":  q.difficulty,
            "subject":     q.subject,
        }
        for q in questions
    ]


def submit_challenge_result(
    db: Session,
    challenge: Challenge,
    user_id: int,
    answers: list,
    total_time: float
) -> dict:
    """Score the submitted answers and update challenge row."""
    correct = 0
    total   = 0

    for a in answers:
        q = db.query(Question).filter(Question.id == a["question_id"]).first()
        if not q:
            continue
        total += 1
        if a.get("answer", "").strip().lower() == q.correct_option.strip().lower():
            correct += 1

    accuracy = round((correct / total) * 100, 2) if total else 0.0
    score    = correct * 10

    is_challenger = challenge.challenger_id == user_id

    if is_challenger:
        challenge.challenger_score    = score
        challenge.challenger_accuracy = accuracy
        challenge.challenger_time     = total_time
    else:
        challenge.opponent_score    = score
        challenge.opponent_accuracy = accuracy
        challenge.opponent_time     = total_time

    # Both sides done → resolve
    elo_change = 0
    both_done = (
        challenge.challenger_score is not None and
        challenge.opponent_score   is not None
    )

    if both_done:
        challenge.status       = "completed"
        challenge.completed_at = datetime.now(timezone.utc)

        cs = challenge.challenger_score
        os = challenge.opponent_score

        if cs > os:
            challenge.winner_id = challenge.challenger_id
        elif os > cs:
            challenge.winner_id = challenge.opponent_id
        else:
            # draw — winner_id stays None
            pass

        # Update ELO
        if challenge.winner_id:
            loser_id = (
                challenge.opponent_id
                if challenge.winner_id == challenge.challenger_id
                else challenge.challenger_id
            )
            w_change, l_change = _update_elo(db, challenge.winner_id, loser_id)
            elo_change = w_change if challenge.winner_id == user_id else l_change
        else:
            # draw
            w_c, _ = _update_elo(db, challenge.challenger_id, challenge.opponent_id, draw=True)
            elo_change = w_c

    db.commit()

    opponent_score = (
        challenge.opponent_score if is_challenger else challenge.challenger_score
    )
    opponent_accuracy = (
        challenge.opponent_accuracy if is_challenger else challenge.challenger_accuracy
    )
    opponent_time = (
        challenge.opponent_time if is_challenger else challenge.challenger_time
    )

    return {
        "challenge_id":      challenge.id,
        "your_score":        score,
        "opponent_score":    opponent_score,
        "your_accuracy":     accuracy,
        "opponent_accuracy": opponent_accuracy,
        "your_time":         total_time,
        "opponent_time":     opponent_time,
        "winner_id":         challenge.winner_id,
        "status":            challenge.status,
        "elo_change":        elo_change,
    }


def get_elo(db: Session, user_id: int):
    elo = _get_or_create_elo(db, user_id)
    return {
        "user_id": user_id,
        "rating":  elo.rating,
        "wins":    elo.wins,
        "losses":  elo.losses,
        "draws":   elo.draws,
        "rank":    _elo_rank(elo.rating),
    }

