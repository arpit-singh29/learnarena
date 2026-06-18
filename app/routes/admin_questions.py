# learnarena/app/routes/admin_questions.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
import json

from app.database import get_db
from app.deps import require_admin
from app.models import User, Course
from app.schemas import QuestionCreateAdmin, QuestionUpdateAdmin, BulkUploadResult
from app.services import question_admin_service

router = APIRouter(prefix="/admin/questions", tags=["Admin - Questions"])


@router.get("/")
def list_questions(
    course_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    items, total = question_admin_service.list_questions(db, course_id, search, skip, limit)
    courses = {c.id: c.title for c in db.query(Course).all()}

    return {
        "total": total,
        "items": [
            {
                "id":             q.id,
                "title":          q.title,
                "description":    q.description,
                "course_id":      q.course_id,
                "course_title":   courses.get(q.course_id, "Unknown"),
                "options":        json.loads(q.options),
                "correct_option": q.correct_option,
                "difficulty":     q.difficulty,
                "subject":        q.subject,
            }
            for q in items
        ],
    }


@router.post("/")
def create_question(
    data: QuestionCreateAdmin,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    try:
        q = question_admin_service.create_question(db, admin.id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"id": q.id, "message": "Question created"}


@router.put("/{question_id}")
def update_question(
    question_id: int,
    data: QuestionUpdateAdmin,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    try:
        q = question_admin_service.update_question(db, question_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"id": q.id, "message": "Question updated"}


@router.delete("/{question_id}")
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    try:
        question_admin_service.delete_question(db, question_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"message": "Question deleted"}


@router.post("/bulk-upload", response_model=BulkUploadResult)
async def bulk_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv file")

    file_bytes = await file.read()

    try:
        result = question_admin_service.bulk_upload_csv(db, admin.id, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result
