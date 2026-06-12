from sqlalchemy import (
    Column, Integer, String, ForeignKey,
    DateTime, Boolean, Float
)
from sqlalchemy.sql import func
from app.database import Base


# ─────────────────────────────────────────────
#  USER
# ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String, nullable=False)
    email         = Column(String, unique=True, nullable=False)
    password      = Column(String, nullable=False)
    role          = Column(String, default="user")
    refresh_token = Column(String, nullable=True)
    created_at    = Column(DateTime, server_default=func.now())


# ─────────────────────────────────────────────
#  COURSE
# ─────────────────────────────────────────────
class Course(Base):
    __tablename__ = "courses"

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String, nullable=False)
    description = Column(String, nullable=False)


# ─────────────────────────────────────────────
#  ENROLLMENT
# ─────────────────────────────────────────────
class Enrollment(Base):
    __tablename__ = "enrollments"

    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)


# ─────────────────────────────────────────────
#  LESSON
# ─────────────────────────────────────────────
class Lesson(Base):
    __tablename__ = "lessons"

    id        = Column(Integer, primary_key=True, index=True)
    title     = Column(String, nullable=False)
    content   = Column(String, nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)


# ─────────────────────────────────────────────
#  PROGRESS
# ─────────────────────────────────────────────
class Progress(Base):
    __tablename__ = "progress"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id  = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    completed  = Column(Boolean, default=False)               # ✅ was String "yes"


# ─────────────────────────────────────────────
#  QUESTION
#  difficulty: "easy" | "medium" | "hard"
#  subject   : free-text e.g. "Maths", "Physics"
#  options   : JSON string  e.g. '["A","B","C","D"]'
# ─────────────────────────────────────────────
class Question(Base):
    __tablename__ = "questions"

    id             = Column(Integer, primary_key=True, index=True)
    title          = Column(String, nullable=False)
    description    = Column(String, nullable=False)
    course_id      = Column(Integer, ForeignKey("courses.id"), nullable=False)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False)
    options        = Column(String, nullable=False)            # JSON string
    correct_option = Column(String, nullable=False)
    difficulty     = Column(String, default="medium")         # ✅ NEW
    subject        = Column(String, default="General")        # ✅ NEW
    created_at     = Column(DateTime, server_default=func.now())


# ─────────────────────────────────────────────
#  ANSWER
#  time_taken_seconds : how long the user spent on this question
# ─────────────────────────────────────────────
class Answer(Base):
    __tablename__ = "answers"

    id                 = Column(Integer, primary_key=True, index=True)
    question_id        = Column(Integer, ForeignKey("questions.id"), nullable=False)
    user_id            = Column(Integer, ForeignKey("users.id"), nullable=False)
    quiz_session_id    = Column(Integer, ForeignKey("quiz_sessions.id"), nullable=True)
    answer_text        = Column(String, nullable=False)
    is_correct         = Column(Boolean, default=False)       # ✅ was String "correct"/"wrong"
    score              = Column(Integer, default=0)
    time_taken_seconds = Column(Float, default=0.0)           # ✅ NEW – needed for speed score
    created_at         = Column(DateTime, server_default=func.now())


# ─────────────────────────────────────────────
#  QUIZ SESSION
# ─────────────────────────────────────────────
class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id  = Column(Integer, ForeignKey("courses.id"), nullable=False)
    score      = Column(Integer, default=0)
    status     = Column(String, default="active")             # active | completed
    started_at = Column(DateTime, server_default=func.now())  # ✅ NEW – for overall session time
    ended_at   = Column(DateTime, nullable=True)              # ✅ NEW – set on submit


# ─────────────────────────────────────────────
#  USER ANALYTICS  (one row per user, updated after every quiz)
# ─────────────────────────────────────────────
class UserAnalytics(Base):
    __tablename__ = "user_analytics"

    id                   = Column(Integer, primary_key=True, index=True)
    user_id              = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Accuracy
    total_attempted      = Column(Integer, default=0)
    total_correct        = Column(Integer, default=0)
    accuracy_score       = Column(Float, default=0.0)         # 0–100

    # Speed  (seconds per question, lower = faster)
    avg_time_per_question = Column(Float, default=0.0)
    speed_score           = Column(Float, default=0.0)        # 0–100

    # Knowledge  (weighted by difficulty)
    easy_correct         = Column(Integer, default=0)
    medium_correct       = Column(Integer, default=0)
    hard_correct         = Column(Integer, default=0)
    knowledge_score      = Column(Float, default=0.0)         # 0–100

    # Consistency  (quiz sessions in last 7 / 30 days)
    streak_days          = Column(Integer, default=0)
    consistency_score    = Column(Float, default=0.0)         # 0–100

    # Hint / persistence
    hints_used           = Column(Integer, default=0)
    total_questions_seen = Column(Integer, default=0)

    # Subject breakdown stored as JSON string
    # e.g. '{"Maths": {"attempted":10,"correct":7}, "Physics": {...}}'
    subject_breakdown    = Column(String, default="{}")

    updated_at           = Column(DateTime, server_default=func.now(), onupdate=func.now())