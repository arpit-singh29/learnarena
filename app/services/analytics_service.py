import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models import Answer, Question, QuizSession, UserAnalytics, User

FAST_BENCH   = 15.0
SLOW_BENCH   = 90.0
SCORE_EASY   = 1
SCORE_MEDIUM = 2
SCORE_HARD   = 4


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


# ── PUBLIC ENTRY POINT ────────────────────────────────────────────
def recalculate(db: Session, user_id: int) -> UserAnalytics:
    answers  = _get_all_answers(db, user_id)
    sessions = _get_all_sessions(db, user_id)

    accuracy_score, total_attempted, total_correct = _calc_accuracy(answers)
    speed_score, avg_time                          = _calc_speed(answers)
    knowledge_score, easy_c, medium_c, hard_c      = _calc_knowledge(db, answers)
    consistency_score, streak                      = _calc_consistency(sessions)
    subject_breakdown                              = _calc_subjects(db, answers)

    analytics = db.query(UserAnalytics).filter(
        UserAnalytics.user_id == user_id
    ).first()

    if not analytics:
        analytics = UserAnalytics(user_id=user_id)
        db.add(analytics)

    analytics.total_attempted        = total_attempted
    analytics.total_correct          = total_correct
    analytics.accuracy_score         = accuracy_score
    analytics.avg_time_per_question  = avg_time
    analytics.speed_score            = speed_score
    analytics.easy_correct           = easy_c
    analytics.medium_correct         = medium_c
    analytics.hard_correct           = hard_c
    analytics.knowledge_score        = knowledge_score
    analytics.streak_days            = streak
    analytics.consistency_score      = consistency_score
    analytics.subject_breakdown      = json.dumps(subject_breakdown)

    db.commit()
    db.refresh(analytics)
    return analytics


# ── ACCURACY ──────────────────────────────────────────────────────
def _calc_accuracy(answers):
    total   = len(answers)
    correct = sum(1 for a in answers if a.is_correct)
    score   = round((correct / total) * 100, 2) if total else 0.0
    return score, total, correct


# ── SPEED ─────────────────────────────────────────────────────────
def _calc_speed(answers):
    times = [a.time_taken_seconds for a in answers if a.time_taken_seconds and a.time_taken_seconds > 0.5]
    if not times:
        return 0.0, 0.0
    avg   = sum(times) / len(times)
    score = _clamp(100 - ((avg - FAST_BENCH) / SLOW_BENCH) * 100)
    return round(score, 2), round(avg, 2)


# ── KNOWLEDGE ─────────────────────────────────────────────────────
def _calc_knowledge(db: Session, answers):
    easy_c = medium_c = hard_c = 0
    easy_t = medium_t = hard_t = 0

    for a in answers:
        question = db.query(Question).filter(Question.id == a.question_id).first()
        if not question:
            continue
        diff = (question.difficulty or "medium").lower()
        if diff == "easy":
            easy_t += 1
            if a.is_correct: easy_c += 1
        elif diff == "hard":
            hard_t += 1
            if a.is_correct: hard_c += 1
        else:
            medium_t += 1
            if a.is_correct: medium_c += 1

    earned  = (easy_c * SCORE_EASY) + (medium_c * SCORE_MEDIUM) + (hard_c * SCORE_HARD)
    max_pts = (easy_t * SCORE_EASY) + (medium_t * SCORE_MEDIUM) + (hard_t * SCORE_HARD)
    score   = round((earned / max_pts) * 100, 2) if max_pts else 0.0
    return score, easy_c, medium_c, hard_c


# ── CONSISTENCY ───────────────────────────────────────────────────
def _calc_consistency(sessions):
    cutoff      = datetime.now() - timedelta(days=30)
    active_days: set = set()

    for s in sessions:
        if not s.started_at:
            continue
        started = s.started_at.replace(tzinfo=None) if hasattr(s.started_at, 'tzinfo') and s.started_at.tzinfo else s.started_at
        if started >= cutoff:
            active_days.add(started.strftime("%Y-%m-%d"))

    streak = len(active_days)
    score  = _clamp(round((streak / 30) * 100, 2))
    return score, streak


# ── SUBJECT BREAKDOWN ─────────────────────────────────────────────
def _calc_subjects(db: Session, answers):
    breakdown: dict = {}

    for a in answers:
        question = db.query(Question).filter(Question.id == a.question_id).first()
        if not question:
            continue
        subj = question.subject or "General"
        if subj not in breakdown:
            breakdown[subj] = {"attempted": 0, "correct": 0}
        breakdown[subj]["attempted"] += 1
        if a.is_correct:
            breakdown[subj]["correct"] += 1

    for subj, data in breakdown.items():
        data["accuracy"] = round(
            (data["correct"] / data["attempted"]) * 100, 2
        ) if data["attempted"] else 0.0

    return breakdown


# ── HELPERS ───────────────────────────────────────────────────────
def _get_all_answers(db: Session, user_id: int):
    return db.query(Answer).filter(Answer.user_id == user_id).all()


def _get_all_sessions(db: Session, user_id: int):
    return db.query(QuizSession).filter(QuizSession.user_id == user_id).all()


# ── DNA REPORT ────────────────────────────────────────────────────
def generate_dna_report(db: Session, user_id: int) -> dict:
    analytics = recalculate(db, user_id)
    user      = db.query(User).filter(User.id == user_id).first()

    subject_breakdown = json.loads(analytics.subject_breakdown or "{}")

    overall = round((
        analytics.accuracy_score +
        analytics.speed_score +
        analytics.knowledge_score +
        analytics.consistency_score
    ) / 4, 2)

    return {
        "user_id":           user_id,
        "username":          user.username if user else "Unknown",
        "accuracy_score":    analytics.accuracy_score,
        "speed_score":       analytics.speed_score,
        "knowledge_score":   analytics.knowledge_score,
        "consistency_score": analytics.consistency_score,
        "overall_score":     overall,
        "rank":              _rank_from_score(overall),
        "strengths":         _detect_strengths(analytics, subject_breakdown),
        "weaknesses":        _detect_weaknesses(analytics, subject_breakdown),
        "advice":            _generate_advice(analytics, subject_breakdown),
        "subject_breakdown": subject_breakdown,
    }


def _rank_from_score(score: float) -> str:
    if score >= 90: return "Master"
    if score >= 75: return "Expert"
    if score >= 60: return "Advanced"
    if score >= 45: return "Skilled"
    if score >= 25: return "Learner"
    return "Beginner"


def _detect_strengths(analytics: UserAnalytics, subjects: dict) -> list:
    # Don't generate strengths for inactive users
    if analytics.total_attempted == 0:
        return []

    s = []
    if analytics.accuracy_score >= 80:
        s.append("High accuracy — you rarely make mistakes")
    if analytics.speed_score >= 75:
        s.append("Fast solver — you answer quickly under pressure")
    if analytics.hard_correct >= 5:
        s.append(f"Hard-question specialist — solved {analytics.hard_correct} hard problems")
    if analytics.consistency_score >= 70:
        s.append("Consistent learner — you study regularly")
    for subj, data in subjects.items():
        if data.get("accuracy", 0) >= 80 and data.get("attempted", 0) >= 5:
            s.append(f"Strong in {subj} ({data['accuracy']}% accuracy)")

    return s or ["Keep solving more questions to discover your strengths!"]


def _detect_weaknesses(analytics: UserAnalytics, subjects: dict) -> list:
    # Don't generate weaknesses for inactive users
    if analytics.total_attempted == 0:
        return []

    w = []
    if analytics.accuracy_score < 50:
        w.append("Accuracy needs work — focus on understanding before speed")
    if 0 < analytics.speed_score < 40:
        w.append("Speed is low — try timed practice sessions")
    if analytics.hard_correct == 0 and analytics.total_attempted >= 10:
        w.append("Struggling with hard questions — try medium first")
    if analytics.consistency_score < 30:
        w.append("Inconsistent study — try solving at least 5 questions daily")
    for subj, data in subjects.items():
        if data.get("accuracy", 0) < 50 and data.get("attempted", 0) >= 5:
            w.append(f"Weak in {subj} ({data['accuracy']}% accuracy)")

    return w or ["No major weaknesses detected — keep it up!"]


def _generate_advice(analytics: UserAnalytics, subjects: dict) -> str:
    if analytics.total_attempted == 0:
        return "Start solving questions to get personalized advice!"

    lines = []

    if analytics.accuracy_score < 60:
        lines.append("Your accuracy is below 60%. Slow down — read each question twice before answering.")
    elif analytics.accuracy_score >= 85:
        lines.append("Excellent accuracy! Start attempting harder questions to push your knowledge score higher.")

    if 0 < analytics.speed_score < 40:
        lines.append("You are spending too long per question. Practice with a timer to build speed.")
    elif analytics.speed_score >= 80 and analytics.accuracy_score < 70:
        lines.append("You answer fast but accuracy is suffering. Take 5 extra seconds to re-read each question.")

    if analytics.consistency_score < 30:
        lines.append("Study more regularly — even 10 minutes daily compounds faster than one long session per week.")

    weak_subjects = [s for s, d in subjects.items() if d.get("accuracy", 0) < 50 and d.get("attempted", 0) >= 3]
    if weak_subjects:
        lines.append(f"Focus extra time on: {', '.join(weak_subjects)}. Start with easy questions and work upward.")

    if not lines:
        lines.append("You are performing well. Keep challenging yourself with hard questions and maintain your streak!")

    return " ".join(lines)
