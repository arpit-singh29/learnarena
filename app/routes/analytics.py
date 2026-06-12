from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.database import get_db
from app.models import User, UserAnalytics
from app.schemas import AnalyticsResponse, DNAReport, SubjectStat
from app.deps import get_current_user
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ── MY ANALYTICS (raw scores) ──────────────────────────────────
@router.get("/me", response_model=AnalyticsResponse)
def my_analytics(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    analytics = db.query(UserAnalytics).filter(
        UserAnalytics.user_id == user.id
    ).first()

    if not analytics:
        # First time — calculate from scratch
        analytics = analytics_service.recalculate(db, user.id)

    raw_breakdown = json.loads(analytics.subject_breakdown or "{}")
    typed_breakdown = {
        subj: SubjectStat(**data)
        for subj, data in raw_breakdown.items()
    }

    return AnalyticsResponse(
        user_id=analytics.user_id,
        total_attempted=analytics.total_attempted,
        total_correct=analytics.total_correct,
        accuracy_score=analytics.accuracy_score,
        avg_time_per_question=analytics.avg_time_per_question,
        speed_score=analytics.speed_score,
        easy_correct=analytics.easy_correct,
        medium_correct=analytics.medium_correct,
        hard_correct=analytics.hard_correct,
        knowledge_score=analytics.knowledge_score,
        streak_days=analytics.streak_days,
        consistency_score=analytics.consistency_score,
        subject_breakdown=typed_breakdown,
    )


# ── MY DNA REPORT ──────────────────────────────────────────────
@router.get("/dna", response_model=DNAReport)
def my_dna_report(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    report = analytics_service.generate_dna_report(db, user.id)

    # convert subject_breakdown dict → SubjectStat objects
    report["subject_breakdown"] = {
        subj: SubjectStat(**data)
        for subj, data in report["subject_breakdown"].items()
    }

    return DNAReport(**report)


# ── ANY USER'S ANALYTICS (admin or public profile) ─────────────
@router.get("/user/{user_id}", response_model=AnalyticsResponse)
def user_analytics(
    user_id: int,
    db: Session = Depends(get_db),
):
    analytics = db.query(UserAnalytics).filter(
        UserAnalytics.user_id == user_id
    ).first()

    if not analytics:
        raise HTTPException(
            status_code=404,
            detail="No analytics found for this user yet"
        )

    raw_breakdown = json.loads(analytics.subject_breakdown or "{}")
    typed_breakdown = {
        subj: SubjectStat(**data)
        for subj, data in raw_breakdown.items()
    }

    return AnalyticsResponse(
        user_id=analytics.user_id,
        total_attempted=analytics.total_attempted,
        total_correct=analytics.total_correct,
        accuracy_score=analytics.accuracy_score,
        avg_time_per_question=analytics.avg_time_per_question,
        speed_score=analytics.speed_score,
        easy_correct=analytics.easy_correct,
        medium_correct=analytics.medium_correct,
        hard_correct=analytics.hard_correct,
        knowledge_score=analytics.knowledge_score,
        streak_days=analytics.streak_days,
        consistency_score=analytics.consistency_score,
        subject_breakdown=typed_breakdown,
    )