# learnarena/app/routes/challenges.py  (updated with notifications)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models import User, Challenge
from app.schemas import ChallengeCreate, ChallengeSubmitRequest
from app.services import challenge_service, badge_service, notification_service

router = APIRouter(prefix="/challenges", tags=["Challenges"])


@router.post("/create")
def create_challenge(
    data: ChallengeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if data.opponent_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot challenge yourself")
    c = challenge_service.create_challenge(
        db, user.id, data.opponent_id, data.course_id, data.mode, data.question_count
    )
    badge_service.check_and_award(db, user.id)

    # 🔔 Notify opponent
    notification_service.create(
        db,
        user_id=data.opponent_id,
        type="challenge_received",
        title="New challenge!",
        message=f"{user.username} challenged you to a {data.mode} battle",
        link="/challenges",
    )
    return c


@router.get("/my")
def my_challenges(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    challenges = db.query(Challenge).filter(
        (Challenge.challenger_id == user.id) | (Challenge.opponent_id == user.id)
    ).order_by(Challenge.id.desc()).all()

    result = []
    for c in challenges:
        challenger = db.query(User).filter(User.id == c.challenger_id).first()
        opponent   = db.query(User).filter(User.id == c.opponent_id).first()
        result.append({
            "id":                  c.id,
            "challenger_id":       c.challenger_id,
            "challenger_username": challenger.username if challenger else "?",
            "opponent_id":         c.opponent_id,
            "opponent_username":   opponent.username if opponent else "?",
            "course_id":           c.course_id,
            "mode":                c.mode,
            "status":              c.status,
            "question_count":      c.question_count,
            "challenger_score":    c.challenger_score,
            "opponent_score":      c.opponent_score,
            "winner_id":           c.winner_id,
            "is_mine":             c.challenger_id == user.id,
        })
    return result


@router.post("/{challenge_id}/accept")
def accept_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    c = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if c.opponent_id != user.id:
        raise HTTPException(status_code=403, detail="Not your challenge")
    if c.status != "pending":
        raise HTTPException(status_code=400, detail="Challenge already responded to")
    c.status = "active"
    db.commit()

    # 🔔 Notify challenger their challenge was accepted
    notification_service.create(
        db,
        user_id=c.challenger_id,
        type="challenge_accepted",
        title="Challenge accepted!",
        message=f"{user.username} accepted your challenge — it's on!",
        link="/challenges",
    )
    return {"message": "Challenge accepted! Go to the quiz."}


@router.post("/{challenge_id}/decline")
def decline_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    c = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if c.opponent_id != user.id:
        raise HTTPException(status_code=403, detail="Not your challenge")
    c.status = "declined"
    db.commit()
    return {"message": "Challenge declined"}


@router.get("/{challenge_id}/questions")
def get_questions(
    challenge_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    c = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if c.challenger_id != user.id and c.opponent_id != user.id:
        raise HTTPException(status_code=403, detail="Not your challenge")
    if c.status not in ("active", "pending"):
        raise HTTPException(status_code=400, detail="Challenge is not active")
    return challenge_service.get_challenge_questions(db, c)


@router.post("/submit")
def submit_challenge(
    data: ChallengeSubmitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    c = db.query(Challenge).filter(Challenge.id == data.challenge_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if c.challenger_id != user.id and c.opponent_id != user.id:
        raise HTTPException(status_code=403, detail="Not your challenge")

    result = challenge_service.submit_challenge_result(
        db, c, user.id, data.answers, data.total_time_secs
    )
    badge_service.check_and_award(db, user.id)

    # 🔔 Notify both players when challenge is fully completed
    if result["status"] == "completed":
        winner_id = result["winner_id"]
        other_id  = c.opponent_id if user.id == c.challenger_id else c.challenger_id

        if winner_id is None:
            # Draw
            notification_service.create(
                db, user_id=other_id,
                type="challenge_completed",
                title="Challenge result: Draw 🤝",
                message=f"Your challenge with {user.username} ended in a draw!",
                link="/challenges",
            )
        elif winner_id == user.id:
            # Current user won
            notification_service.create(
                db, user_id=other_id,
                type="challenge_completed",
                title="Challenge result: You lost 😤",
                message=f"{user.username} beat you in a challenge. Rematch?",
                link="/challenges",
            )
        else:
            # Current user lost
            notification_service.create(
                db, user_id=other_id,
                type="challenge_completed",
                title="Challenge result: You won! 🏆",
                message=f"You beat {user.username} in a challenge!",
                link="/challenges",
            )

    return result


@router.get("/elo/me")
def my_elo(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return challenge_service.get_elo(db, user.id)


@router.get("/elo/{user_id}")
def user_elo(user_id: int, db: Session = Depends(get_db)):
    return challenge_service.get_elo(db, user_id)


@router.get("/elo/leaderboard")
def elo_leaderboard(db: Session = Depends(get_db)):
    """Return top 50 players by ELO rating."""
    from app.models import EloRating
    ratings = db.query(EloRating).order_by(EloRating.rating.desc()).limit(50).all()
    result = []
    for r in ratings:
        user = db.query(User).filter(User.id == r.user_id).first()
        if not user:
            continue
        result.append({
            "user_id":  r.user_id,
            "username": user.username,
            "rating":   r.rating,
            "rank":     _elo_rank_label(r.rating),
            "wins":     r.wins,
            "losses":   r.losses,
            "draws":    r.draws,
        })
    return result


def _elo_rank_label(rating: int) -> str:
    if rating >= 2000: return "Diamond"
    if rating >= 1600: return "Platinum"
    if rating >= 1300: return "Gold"
    if rating >= 1100: return "Silver"
    return "Bronze"