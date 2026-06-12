"""
analytics_service.py
─────────────────────────────────────────────────────────────────
The brain of LearnArena.

Called after every quiz submit.  Reads all Answer rows for the user,
re-calculates every score from scratch, and upserts UserAnalytics.

Score formulas
──────────────
Accuracy  = (correct / attempted) * 100

Speed     = clamp(100 - ((avg_secs - FAST_BENCH) / SLOW_BENCH) * 100, 0, 100)
            FAST_BENCH = 30 s  (fast solver baseline)
            SLOW_BENCH = 120 s (slow solver baseline)

Knowledge = weighted sum
            easy   correct → 1 pt each
            medium correct → 2 pt each
            hard   correct → 4 pt each
            max    = total possible pts   → scale 0–100

Consistency = based on unique quiz days in last 30 days
              1 day → 3.3, 7 days → 23, 14 days → 47, 30 days → 100

Overall     = average of the four scores (equal weight for now)
"""

import json
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Answer, Question, QuizSession, UserAnalytics, User


# ── tuneable constants ──────────────────────────────────────────
FAST_BENCH  = 30.0    # seconds — faster than this → speed bonus
SLOW_BENCH  = 120.0   # seconds — slower than this → speed penalty
SCORE_EASY   = 1
SCORE_MEDIUM = 2
SCORE_HARD   = 4
# ───────────────────────────────────────────────────────────────


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


# ── PUBLIC ENTRY POINT ──────────────────────────────────────────
def recalculate(db: Session, user_id: int) -> UserAnalytics:
    """
    Re-calculate ALL analytics for a user from their full answer history.
    Upserts the UserAnalytics row and returns it.
    """
    answers  = _get_all_answers(db, user_id)
    sessions = _get_all_sessions(db, user_id)

    accuracy_score, total_attempted, total_correct = _calc_accuracy(answers)
    speed_score, avg_time = _calc_speed(answers)
    knowledge_score, easy_c, medium_c, hard_c = _calc_knowledge(db, answers)
    consistency_score, streak = _calc_consistency(sessions)
    subject_breakdown = _calc_subjects(db, answers)

    analytics = db.query(UserAnalytics).filter(
        UserAnalytics.user_id == user_id
    ).first()

    if not analytics:
        analytics = UserAnalytics(user_id=user_id)
        db.add(analytics)

    analytics.total_attempted       = total_attempted
    analytics.total_correct         = total_correct
    analytics.accuracy_score        = accuracy_score
    analytics.avg_time_per_question = avg_time
    analytics.speed_score           = speed_score
    analytics.easy_correct          = easy_c
    analytics.medium_correct        = medium_c
    analytics.hard_correct          = hard_c
    analytics.knowledge_score       = knowledge_score
    analytics.streak_days           = streak
    analytics.consistency_score     = consistency_score
    analytics.subject_breakdown     = json.dumps(subject_breakdown)

    db.commit()
    db.refresh(analytics)
    return analytics


# ── ACCURACY ────────────────────────────────────────────────────
def _calc_accuracy(answers):
    total     = len(answers)
    correct   = sum(1 for a in answers if a.is_correct)
    score     = round((correct / total) * 100, 2) if total else 0.0
    return score, total, correct


# ── SPEED ───────────────────────────────────────────────────────
def _calc_speed(answers):
    times = [a.time_taken_seconds for a in answers if a.time_taken_seconds > 0]

    if not times:
        return 50.0, 0.0      # default mid-range if no time data

    avg   = sum(times) / len(times)
    score = _clamp(
        100 - ((avg - FAST_BENCH) / SLOW_BENCH) * 100
    )
    return round(score, 2), round(avg, 2)


# ── KNOWLEDGE ───────────────────────────────────────────────────
def _calc_knowledge(db: Session, answers):
    easy_c = medium_c = hard_c = 0
    easy_t = medium_t = hard_t = 0      # totals (attempted)

    for a in answers:
        question = db.query(Question).filter(
            Question.id == a.question_id
        ).first()
        if not question:
            continue

        diff = (question.difficulty or "medium").lower()

        if diff == "easy":
            easy_t += 1
            if a.is_correct:
                easy_c += 1
        elif diff == "hard":
            hard_t += 1
            if a.is_correct:
                hard_c += 1
        else:
            medium_t += 1
            if a.is_correct:
                medium_c += 1

    earned = (easy_c * SCORE_EASY) + (medium_c * SCORE_MEDIUM) + (hard_c * SCORE_HARD)
    max_pts = (easy_t * SCORE_EASY) + (medium_t * SCORE_MEDIUM) + (hard_t * SCORE_HARD)

    score = round((earned / max_pts) * 100, 2) if max_pts else 0.0
    return score, easy_c, medium_c, hard_c


# ── CONSISTENCY ─────────────────────────────────────────────────
def _calc_consistency(sessions):
    """
    Count how many unique calendar days in the last 30 days
    the user started at least one quiz session.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    active_days: set[str] = set()

    for s in sessions:
        if s.started_at and s.started_at >= cutoff:
            active_days.add(s.started_at.strftime("%Y-%m-%d"))

    streak = len(active_days)
    score  = _clamp(round((streak / 30) * 100, 2))
    return score, streak


# ── SUBJECT BREAKDOWN ───────────────────────────────────────────
def _calc_subjects(db: Session, answers):
    breakdown: dict[str, dict] = {}

    for a in answers:
        question = db.query(Question).filter(
            Question.id == a.question_id
        ).first()
        if not question:
            continue

        subj = question.subject or "General"

        if subj not in breakdown:
            breakdown[subj] = {"attempted": 0, "correct": 0}

        breakdown[subj]["attempted"] += 1
        if a.is_correct:
            breakdown[subj]["correct"] += 1

    # add accuracy per subject
    for subj, data in breakdown.items():
        data["accuracy"] = round(
            (data["correct"] / data["attempted"]) * 100, 2
        ) if data["attempted"] else 0.0

    return breakdown


# ── HELPERS ─────────────────────────────────────────────────────
def _get_all_answers(db: Session, user_id: int):
    return db.query(Answer).filter(Answer.user_id == user_id).all()


def _get_all_sessions(db: Session, user_id: int):
    return db.query(QuizSession).filter(QuizSession.user_id == user_id).all()


# ── DNA REPORT ──────────────────────────────────────────────────
def generate_dna_report(db: Session, user_id: int) -> dict:
    """
    Calls recalculate() then builds a human-readable DNA report.
    Returns a plain dict (serialised by the route layer).
    """
    analytics = recalculate(db, user_id)
    user      = db.query(User).filter(User.id == user_id).first()

    subject_breakdown = json.loads(analytics.subject_breakdown or "{}")

    # overall score = equal-weight average of four scores
    overall = round(
        (
            analytics.accuracy_score +
            analytics.speed_score +
            analytics.knowledge_score +
            analytics.consistency_score
        ) / 4,
        2
    )

    rank = _rank_from_score(overall)

    strengths  = _detect_strengths(analytics, subject_breakdown)
    weaknesses = _detect_weaknesses(analytics, subject_breakdown)
    advice     = _generate_advice(analytics, subject_breakdown, weaknesses)

    return {
        "user_id":           user_id,
        "username":          user.username if user else "Unknown",
        "accuracy_score":    analytics.accuracy_score,
        "speed_score":       analytics.speed_score,
        "knowledge_score":   analytics.knowledge_score,
        "consistency_score": analytics.consistency_score,
        "overall_score":     overall,
        "rank":              rank,
        "strengths":         strengths,
        "weaknesses":        weaknesses,
        "advice":            advice,
        "subject_breakdown": subject_breakdown,
    }


def _rank_from_score(score: float) -> str:
    if score >= 90:  return "Master"
    if score >= 75:  return "Expert"
    if score >= 60:  return "Advanced"
    if score >= 45:  return "Skilled"
    if score >= 25:  return "Learner"
    return "Beginner"


def _detect_strengths(analytics: UserAnalytics, subjects: dict) -> list[str]:
    strengths = []

    if analytics.accuracy_score >= 80:
        strengths.append("High accuracy — you rarely make mistakes")
    if analytics.speed_score >= 75:
        strengths.append("Fast solver — you answer quickly under pressure")
    if analytics.hard_correct >= 5:
        strengths.append(f"Hard-question specialist — solved {analytics.hard_correct} hard problems")
    if analytics.consistency_score >= 70:
        strengths.append("Consistent learner — you study regularly")

    for subj, data in subjects.items():
        if data.get("accuracy", 0) >= 80 and data.get("attempted", 0) >= 5:
            strengths.append(f"Strong in {subj} ({data['accuracy']}% accuracy)")

    return strengths or ["Keep solving more questions to discover your strengths!"]


def _detect_weaknesses(analytics: UserAnalytics, subjects: dict) -> list[str]:
    weaknesses = []

    if analytics.accuracy_score < 50:
        weaknesses.append("Accuracy needs work — focus on understanding before speed")
    if analytics.speed_score < 40:
        weaknesses.append("Speed is low — try timed practice sessions")
    if analytics.hard_correct == 0 and analytics.total_attempted >= 10:
        weaknesses.append("Struggling with hard questions — try medium first")
    if analytics.consistency_score < 30:
        weaknesses.append("Inconsistent study — try solving at least 5 questions daily")

    for subj, data in subjects.items():
        if data.get("accuracy", 0) < 50 and data.get("attempted", 0) >= 5:
            weaknesses.append(f"Weak in {subj} ({data['accuracy']}% accuracy)")

    return weaknesses or ["No major weaknesses detected — keep it up!"]


def _generate_advice(analytics: UserAnalytics, subjects: dict, weaknesses: list[str]) -> str:
    lines = []

    # accuracy advice
    if analytics.accuracy_score < 60:
        lines.append(
            "Your accuracy is below 60%. Slow down — read each question twice "
            "before answering. Speed without accuracy costs more marks."
        )
    elif analytics.accuracy_score >= 85:
        lines.append(
            "Excellent accuracy! Start attempting harder questions to push your "
            "knowledge score higher."
        )

    # speed advice
    if analytics.speed_score < 40:
        lines.append(
            "You are spending too long per question. Practice with a 60-second "
            "timer to build answering speed."
        )
    elif analytics.speed_score >= 80 and analytics.accuracy_score < 70:
        lines.append(
            "You answer fast but accuracy is suffering. Slow down slightly — "
            "a 5-second pause to re-read the question can save the answer."
        )

    # consistency advice
    if analytics.consistency_score < 30:
        lines.append(
            "You are not studying regularly. Even 10 minutes a day compounds "
            "faster than a 3-hour session once a week."
        )

    # subject-specific
    weak_subjects = [
        s for s, d in subjects.items()
        if d.get("accuracy", 0) < 50 and d.get("attempted", 0) >= 3
    ]
    if weak_subjects:
        joined = ", ".join(weak_subjects)
        lines.append(
            f"Focus extra time on: {joined}. "
            "Start with easy questions in these subjects and work upward."
        )

    if not lines:
        lines.append(
            "You are performing well across the board. "
            "Keep challenging yourself with hard questions and maintain your streak!"
        )

    return " ".join(lines)