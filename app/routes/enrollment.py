from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Enrollment, Course, User
from app.deps import get_current_user
from app.schemas import CourseResponse

router = APIRouter()


# ---------------- ENROLL IN COURSE ----------------
@router.post("/enroll/{course_id}")
def enroll_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    course = db.query(Course).filter(
        Course.id == course_id
    ).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found"
        )

    existing = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id,
        Enrollment.course_id == course_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Already enrolled"
        )

    enrollment = Enrollment(
        user_id=current_user.id,
        course_id=course_id
    )

    db.add(enrollment)
    db.commit()

    return {
        "message": f"Enrolled in {course.title}"
    }


# ---------------- MY COURSES ----------------
@router.get("/my-courses", response_model=list[CourseResponse])
def my_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    enrollments = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id
    ).all()

    course_ids = [e.course_id for e in enrollments]

    courses = db.query(Course).filter(
        Course.id.in_(course_ids)
    ).all()

    return courses


# ---------------- UNENROLL ----------------
@router.delete("/unenroll/{course_id}")
def unenroll_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id,
        Enrollment.course_id == course_id
    ).first()

    if not enrollment:
        raise HTTPException(
            status_code=404,
            detail="Enrollment not found"
        )

    db.delete(enrollment)
    db.commit()

    return {
        "message": "Successfully unenrolled from course"
    }