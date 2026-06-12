from sqlalchemy.orm import Session
from app.models import User, Answer


def get_leaderboard(db: Session):

    results = db.query(
        User.id,
        User.username,
        Answer.user_id,
        Answer.score,
        Answer.is_correct
    ).join(
        Answer,
        User.id == Answer.user_id
    ).all()

    leaderboard = {}

    for r in results:

        if r.user_id not in leaderboard:
            leaderboard[r.user_id] = {
                "user_id": r.user_id,
                "username": r.username,
                "total_score": 0,
                "correct_answers": 0
            }

        leaderboard[r.user_id]["total_score"] += r.score

        if r.is_correct:
            leaderboard[r.user_id]["correct_answers"] += 1

    sorted_board = sorted(
        leaderboard.values(),
        key=lambda x: (
            x["total_score"],
            x["correct_answers"]
        ),
        reverse=True
    )

    return sorted_board