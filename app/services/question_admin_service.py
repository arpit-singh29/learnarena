# learnarena/app/services/question_admin_service.py
"""
Admin-side question management: CRUD + CSV bulk upload.

CSV format expected (header row required):
title,description,course_id,options,correct_option,difficulty,subject

Notes:
- options is a pipe-separated list, e.g.  Paris|London|Berlin|Madrid
  (pipe avoids collision with commas inside option text)
- difficulty must be one of: easy, medium, hard  (case-insensitive, normalized)
- correct_option must exactly match one of the options (case-insensitive match,
  but stored using the option's original casing)
- subject is free text, defaults to "General" if blank
"""
import csv
import io
import json
from typing import List
from sqlalchemy.orm import Session

from app.models import Question, Course

VALID_DIFFICULTIES = {"easy", "medium", "hard"}
REQUIRED_HEADERS = {"title", "description", "course_id", "options", "correct_option"}


# ── Single question CRUD (admin) ───────────────────────────────
def list_questions(db: Session, course_id: int = None, search: str = None, skip: int = 0, limit: int = 50):
    query = db.query(Question)
    if course_id:
        query = query.filter(Question.course_id == course_id)
    if search:
        query = query.filter(Question.title.ilike(f"%{search}%"))
    total = query.count()
    items = query.order_by(Question.id.desc()).offset(skip).limit(limit).all()
    return items, total


def create_question(db: Session, user_id: int, data) -> Question:
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise ValueError(f"Course id {data.course_id} does not exist")

    difficulty = (data.difficulty or "medium").lower()
    if difficulty not in VALID_DIFFICULTIES:
        raise ValueError(f"difficulty must be one of {VALID_DIFFICULTIES}, got '{data.difficulty}'")

    if data.correct_option not in data.options:
        raise ValueError("correct_option must exactly match one of the provided options")

    q = Question(
        title=data.title,
        description=data.description,
        course_id=data.course_id,
        user_id=user_id,
        options=json.dumps(data.options),
        correct_option=data.correct_option,
        difficulty=difficulty,
        subject=data.subject or "General",
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


def update_question(db: Session, question_id: int, data) -> Question:
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise ValueError("Question not found")

    if data.title is not None:
        q.title = data.title
    if data.description is not None:
        q.description = data.description
    if data.options is not None:
        q.options = json.dumps(data.options)
    if data.correct_option is not None:
        q.correct_option = data.correct_option
    if data.difficulty is not None:
        difficulty = data.difficulty.lower()
        if difficulty not in VALID_DIFFICULTIES:
            raise ValueError(f"difficulty must be one of {VALID_DIFFICULTIES}")
        q.difficulty = difficulty
    if data.subject is not None:
        q.subject = data.subject

    db.commit()
    db.refresh(q)
    return q


def delete_question(db: Session, question_id: int):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise ValueError("Question not found")
    db.delete(q)
    db.commit()


# ── CSV Bulk Upload ──────────────────────────────────────────────
def bulk_upload_csv(db: Session, user_id: int, file_bytes: bytes) -> dict:
    """
    Parses CSV, validates each row independently, imports valid rows,
    and returns a detailed report of what succeeded/failed.
    Never raises on bad rows — only raises if the file itself is unreadable
    or missing required headers.
    """
    try:
        text = file_bytes.decode("utf-8-sig")  # handles Excel BOM
    except UnicodeDecodeError:
        raise ValueError("File is not valid UTF-8 text. Please save the CSV as UTF-8.")

    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise ValueError("CSV file appears to be empty")

    headers = {h.strip().lower() for h in reader.fieldnames}
    missing = REQUIRED_HEADERS - headers
    if missing:
        raise ValueError(
            f"CSV is missing required columns: {', '.join(sorted(missing))}. "
            f"Required columns: {', '.join(sorted(REQUIRED_HEADERS))}"
        )

    # Pre-fetch valid course ids for fast validation
    valid_course_ids = {c.id for c in db.query(Course.id).all()}

    imported = 0
    errors: List[dict] = []
    rows_to_insert = []

    for row_num, raw_row in enumerate(reader, start=2):  # start=2 since row 1 is header
        row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items()}

        # Validate course_id
        course_id_str = row.get("course_id", "")
        try:
            course_id = int(course_id_str)
        except ValueError:
            errors.append({"row_number": row_num, "reason": f"course_id '{course_id_str}' is not a number"})
            continue

        if course_id not in valid_course_ids:
            errors.append({"row_number": row_num, "reason": f"course_id {course_id} does not exist"})
            continue

        # Validate title/description
        title = row.get("title", "")
        description = row.get("description", "") or title
        if not title:
            errors.append({"row_number": row_num, "reason": "title is empty"})
            continue

        # Validate options (pipe-separated)
        options_raw = row.get("options", "")
        options = [o.strip() for o in options_raw.split("|") if o.strip()]
        if len(options) < 2:
            errors.append({"row_number": row_num, "reason": f"options must have at least 2 choices separated by '|', got: '{options_raw}'"})
            continue

        # Validate correct_option matches one of the options
        correct_option = row.get("correct_option", "")
        matched = None
        for opt in options:
            if opt.lower() == correct_option.lower():
                matched = opt
                break
        if matched is None:
            errors.append({"row_number": row_num, "reason": f"correct_option '{correct_option}' does not match any option in '{options_raw}'"})
            continue

        # Validate difficulty (default to medium if blank/invalid, but flag invalid)
        difficulty_raw = row.get("difficulty", "").lower()
        if difficulty_raw and difficulty_raw not in VALID_DIFFICULTIES:
            errors.append({"row_number": row_num, "reason": f"difficulty '{difficulty_raw}' invalid, must be easy/medium/hard"})
            continue
        difficulty = difficulty_raw if difficulty_raw in VALID_DIFFICULTIES else "medium"

        subject = row.get("subject", "") or "General"

        rows_to_insert.append(Question(
            title=title,
            description=description,
            course_id=course_id,
            user_id=user_id,
            options=json.dumps(options),
            correct_option=matched,
            difficulty=difficulty,
            subject=subject,
        ))
        imported += 1

    # Bulk insert all valid rows in one transaction
    if rows_to_insert:
        db.bulk_save_objects(rows_to_insert)
        db.commit()

    total_rows = imported + len(errors)

    return {
        "total_rows": total_rows,
        "imported":   imported,
        "skipped":    len(errors),
        "errors":     errors,
    }
