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


# ─────────────────────────────────────────────
#  FRIEND REQUEST
#  status: "pending" | "accepted" | "rejected"
# ─────────────────────────────────────────────
class FriendRequest(Base):
    __tablename__ = "friend_requests"

    id          = Column(Integer, primary_key=True, index=True)
    sender_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status      = Column(String, default="pending")   # pending|accepted|rejected
    created_at  = Column(DateTime, server_default=func.now())


# ─────────────────────────────────────────────
#  CHALLENGE
#  mode: "accuracy" | "speed" | "mixed"
#  status: "pending" | "active" | "completed" | "declined"
# ─────────────────────────────────────────────
class Challenge(Base):
    __tablename__ = "challenges"

    id              = Column(Integer, primary_key=True, index=True)
    challenger_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    opponent_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id       = Column(Integer, ForeignKey("courses.id"), nullable=False)
    mode            = Column(String, default="mixed")      # accuracy|speed|mixed
    status          = Column(String, default="pending")    # pending|active|completed|declined
    question_count  = Column(Integer, default=5)

    # scores filled in when each side completes
    challenger_score   = Column(Integer, nullable=True)
    opponent_score     = Column(Integer, nullable=True)
    challenger_accuracy = Column(Float, nullable=True)
    opponent_accuracy   = Column(Float, nullable=True)
    challenger_time    = Column(Float, nullable=True)
    opponent_time      = Column(Float, nullable=True)

    winner_id       = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime, server_default=func.now())
    completed_at    = Column(DateTime, nullable=True)


# ─────────────────────────────────────────────
#  BADGE DEFINITION  (seeded once)
# ─────────────────────────────────────────────
class Badge(Base):
    __tablename__ = "badges"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=False)
    icon        = Column(String, default="🏅")      # emoji
    condition   = Column(String, nullable=False)     # machine-readable key


# ─────────────────────────────────────────────
#  USER BADGE  (awarded badges)
# ─────────────────────────────────────────────
class UserBadge(Base):
    __tablename__ = "user_badges"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    badge_id    = Column(Integer, ForeignKey("badges.id"), nullable=False)
    awarded_at  = Column(DateTime, server_default=func.now())


# ─────────────────────────────────────────────
#  ELO RATING
# ─────────────────────────────────────────────
class EloRating(Base):
    __tablename__ = "elo_ratings"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    rating     = Column(Integer, default=1000)       # start at 1000 like chess
    wins       = Column(Integer, default=0)
    losses     = Column(Integer, default=0)
    draws      = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ─────────────────────────────────────────────
#  NOTIFICATION
#  type: "friend_request" | "friend_accepted" |
#        "challenge_received" | "challenge_accepted" |
#        "challenge_completed" | "badge_earned"
# ─────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)  # recipient
    type       = Column(String, nullable=False)
    title      = Column(String, nullable=False)
    message    = Column(String, nullable=False)
    link       = Column(String, nullable=True)   # e.g. "/challenges" or "/friends"
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
