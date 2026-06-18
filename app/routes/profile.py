# learnarena/app/routes/profile.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.database import get_db
from app.deps import get_current_user
from app.models import User, UserAnalytics, UserBadge, Badge, EloRating, Challenge
from app.services import friend_service

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/{username}")
def get_profile(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ── Analytics ──────────────────────────────────────────────
    analytics = db.query(UserAnalytics).filter(
        UserAnalytics.user_id == user.id
    ).first()

    subject_breakdown = {}
    if analytics and analytics.subject_breakdown:
        raw = json.loads(analytics.subject_breakdown)
        # Only include subjects with attempts
        subject_breakdown = {
            k: v for k, v in raw.items() if v.get("attempted", 0) > 0
        }

    # ── ELO ────────────────────────────────────────────────────
    elo = db.query(EloRating).filter(EloRating.user_id == user.id).first()

    # ── Badges (earned only) ───────────────────────────────────
    earned_badges = (
        db.query(Badge)
        .join(UserBadge, UserBadge.badge_id == Badge.id)
        .filter(UserBadge.user_id == user.id)
        .all()
    )

    # ── Friend status with current user ───────────────────────
    friend_status = "self"
    if current_user.id != user.id:
        all_friends = friend_service.get_friends(db, current_user.id)
        friend_ids  = {f.id for f in all_friends}
        if user.id in friend_ids:
            friend_status = "friends"
        else:
            friend_status = "not_friends"

    return {
        "id":       user.id,
        "username": user.username,
        "joined":   user.created_at.strftime("%B %Y") if user.created_at else "Unknown",

        # ELO
        "elo_rating": elo.rating  if elo else 1000,
        "elo_rank":   _elo_rank(elo.rating if elo else 1000),
        "wins":       elo.wins    if elo else 0,
        "losses":     elo.losses  if elo else 0,
        "draws":      elo.draws   if elo else 0,

        # Analytics
        "total_attempted":  analytics.total_attempted  if analytics else 0,
        "total_correct":    analytics.total_correct    if analytics else 0,
        "accuracy_score":   analytics.accuracy_score   if analytics else 0.0,
        "speed_score":      analytics.speed_score      if analytics else 0.0,
        "knowledge_score":  analytics.knowledge_score  if analytics else 0.0,
        "streak_days":      analytics.streak_days      if analytics else 0,
        "hard_correct":     analytics.hard_correct     if analytics else 0,
        "subject_breakdown": subject_breakdown,

        # Badges
        "badges": [
            {"name": b.name, "icon": b.icon, "description": b.description}
            for b in earned_badges
        ],

        # Relationship
        "friend_status": friend_status,  # "self" | "friends" | "not_friends"
    }


def _elo_rank(rating: int) -> str:
    if rating >= 2000: return "Diamond"
    if rating >= 1600: return "Platinum"
    if rating >= 1300: return "Gold"
    if rating >= 1100: return "Silver"
    return "Bronze"
