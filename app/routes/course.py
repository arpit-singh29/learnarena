from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Course
from app.schemas import CourseCreate, CourseResponse
from app.deps import require_admin

from app.services import course_service

router = APIRouter()


# ---------------- CREATE COURSE ----------------
@router.post("/courses", response_model=CourseResponse)
def create_course(
    course: CourseCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    return course_service.create_course(
        db=db,
        title=course.title,
        description=course.description
    )


# ---------------- GET ALL COURSES ----------------
@router.get("/courses", response_model=list[CourseResponse])
def get_courses(db: Session = Depends(get_db)):
    return course_service.get_all_courses(db)


# ---------------- GET COURSE BY ID ----------------
@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db)):

    course = course_service.get_course_by_id(db, course_id)

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    return course


# ---------------- UPDATE COURSE ----------------
@router.put("/courses/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    updated_course: CourseCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):

    course = course_service.get_course_by_id(db, course_id)

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    return course_service.update_course(
        db=db,
        course=course,
        title=updated_course.title,
        description=updated_course.description
    )


# ---------------- DELETE COURSE ----------------
@router.delete("/courses/{course_id}")
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):

    course = course_service.get_course_by_id(db, course_id)

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course_service.delete_course(db, course)

    return {
        "message": "Course deleted successfully"
    }