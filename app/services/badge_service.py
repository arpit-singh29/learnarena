"""
badge_service.py
────────────────
Seeds all badge definitions once.
After every quiz/challenge, call check_and_award(db, user_id)
to automatically grant any newly earned badges.
"""
from sqlalchemy.orm import Session
from app.models import Badge, UserBadge, UserAnalytics, Answer, Challenge

# ── Badge definitions ──────────────────────────────────────────
BADGE_DEFS = [
    # First steps
    {"name": "First Step",       "icon": "👣", "description": "Solve your first question",          "condition": "first_answer"},
    {"name": "Quick Start",      "icon": "🚀", "description": "Complete your first quiz",            "condition": "first_quiz"},
    # Accuracy
    {"name": "Sharp Shooter",    "icon": "🎯", "description": "Reach 80% accuracy",                 "condition": "accuracy_80"},
    {"name": "Accuracy Master",  "icon": "💎", "description": "Reach 95% accuracy",                 "condition": "accuracy_95"},
    # Speed
    {"name": "Speed Demon",      "icon": "⚡", "description": "Avg under 20s per question",         "condition": "speed_20"},
    {"name": "Lightning",        "icon": "🌩️", "description": "Avg under 10s per question",         "condition": "speed_10"},
    # Knowledge
    {"name": "Hard Crusher",     "icon": "💪", "description": "Solve 5 hard questions correctly",   "condition": "hard_5"},
    {"name": "Hard Master",      "icon": "🧠", "description": "Solve 20 hard questions correctly",  "condition": "hard_20"},
    # Consistency
    {"name": "3 Day Streak",     "icon": "🔥", "description": "Study 3 days in a row",              "condition": "streak_3"},
    {"name": "7 Day Streak",     "icon": "🔥", "description": "Study 7 days in a row",              "condition": "streak_7"},
    {"name": "30 Day Streak",    "icon": "🏆", "description": "Study 30 days in a row",             "condition": "streak_30"},
    # Volume
    {"name": "Century",          "icon": "💯", "description": "Solve 100 questions",                "condition": "answered_100"},
    {"name": "Question Machine", "icon": "🤖", "description": "Solve 500 questions",                "condition": "answered_500"},
    # Challenges
    {"name": "Challenger",       "icon": "⚔️", "description": "Send your first challenge",          "condition": "challenge_sent_1"},
    {"name": "Victor",           "icon": "🥇", "description": "Win your first challenge",           "condition": "challenge_won_1"},
    {"name": "Undefeated",       "icon": "👑", "description": "Win 10 challenges",                  "condition": "challenge_won_10"},
]


def seed_badges(db: Session):
    """Call once on startup to ensure all badge rows exist."""
    for b in BADGE_DEFS:
        exists = db.query(Badge).filter(Badge.condition == b["condition"]).first()
        if not exists:
            db.add(Badge(**b))
    db.commit()


def _already_has(db: Session, user_id: int, condition: str) -> bool:
    badge = db.query(Badge).filter(Badge.condition == condition).first()
    if not badge:
        return True   # badge not seeded yet — skip
    return db.query(UserBadge).filter(
        UserBadge.user_id  == user_id,
        UserBadge.badge_id == badge.id
    ).first() is not None


def _award(db: Session, user_id: int, condition: str):
    if _already_has(db, user_id, condition):
        return
    badge = db.query(Badge).filter(Badge.condition == condition).first()
    if badge:
        db.add(UserBadge(user_id=user_id, badge_id=badge.id))
        db.commit()


def check_and_award(db: Session, user_id: int):
    """Check all conditions and award any newly earned badges."""
    analytics = db.query(UserAnalytics).filter(
        UserAnalytics.user_id == user_id
    ).first()

    total_answers = db.query(Answer).filter(Answer.user_id == user_id).count()
    challenges_sent = db.query(Challenge).filter(Challenge.challenger_id == user_id).count()
    challenges_won  = db.query(Challenge).filter(
        Challenge.winner_id == user_id
    ).count()

    checks = {
        "first_answer":      total_answers >= 1,
        "first_quiz":        total_answers >= 1,
        "accuracy_80":       analytics and analytics.accuracy_score >= 80,
        "accuracy_95":       analytics and analytics.accuracy_score >= 95,
        "speed_20":          analytics and 0 < analytics.avg_time_per_question <= 20,
        "speed_10":          analytics and 0 < analytics.avg_time_per_question <= 10,
        "hard_5":            analytics and analytics.hard_correct >= 5,
        "hard_20":           analytics and analytics.hard_correct >= 20,
        "streak_3":          analytics and analytics.streak_days >= 3,
        "streak_7":          analytics and analytics.streak_days >= 7,
        "streak_30":         analytics and analytics.streak_days >= 30,
        "answered_100":      total_answers >= 100,
        "answered_500":      total_answers >= 500,
        "challenge_sent_1":  challenges_sent >= 1,
        "challenge_won_1":   challenges_won >= 1,
        "challenge_won_10":  challenges_won >= 10,
    }

    for condition, earned in checks.items():
        if earned:
            _award(db, user_id, condition)


def get_all_badges_for_user(db: Session, user_id: int):
    """Return all badge defs with earned=True/False for this user."""
    all_badges = db.query(Badge).all()
    earned_ids = {
        ub.badge_id
        for ub in db.query(UserBadge).filter(UserBadge.user_id == user_id).all()
    }
    result = []
    for b in all_badges:
        result.append({
            "id":          b.id,
            "name":        b.name,
            "description": b.description,
            "icon":        b.icon,
            "condition":   b.condition,
            "earned":      b.id in earned_ids,
        })
    return result