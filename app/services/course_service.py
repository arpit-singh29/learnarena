from sqlalchemy.orm import Session
from app.models import Course


# ---------------- CREATE COURSE ----------------
def create_course(db: Session, title: str, description: str):
    course = Course(title=title, description=description)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


# ---------------- GET ALL COURSES ----------------
def get_all_courses(db: Session):
    return db.query(Course).all()


# ---------------- GET COURSE BY ID ----------------
def get_course_by_id(db: Session, course_id: int):
    return db.query(Course).filter(Course.id == course_id).first()


# ---------------- UPDATE COURSE ----------------
def update_course(db: Session, course: Course, title: str, description: str):
    course.title = title
    course.description = description
    db.commit()
    db.refresh(course)
    return course


# ---------------- DELETE COURSE ----------------
def delete_course(db: Session, course: Course):
    db.delete(course)
    db.commit()
    return True