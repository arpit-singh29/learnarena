from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from datetime import datetime

# ─────────────────────────────────────────────
#  USER
# ─────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    email:    EmailStr
    password: str


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class UserResponse(BaseModel):
    id:       int
    username: str
    email:    str
    role:     str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  COURSE
# ─────────────────────────────────────────────
class CourseCreate(BaseModel):
    title:       str
    description: str


class CourseResponse(BaseModel):
    id:          int
    title:       str
    description: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  LESSON
# ─────────────────────────────────────────────
class LessonCreate(BaseModel):
    title:     str
    content:   str
    course_id: int


class LessonResponse(BaseModel):
    id:        int
    title:     str
    content:   str
    course_id: int

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  PROGRESS
# ─────────────────────────────────────────────
class ProgressResponse(BaseModel):
    id:        int
    user_id:   int
    lesson_id: int
    completed: bool                         # ✅ now bool

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  QUESTION
# ─────────────────────────────────────────────
class QuestionCreate(BaseModel):
    title:          str
    description:    str
    course_id:      int
    options:        List[str]               # ["A","B","C","D"]
    correct_option: str
    difficulty:     str = "medium"          # ✅ NEW
    subject:        str = "General"         # ✅ NEW


class QuestionResponse(BaseModel):
    id:             int
    title:          str
    description:    str
    course_id:      int
    user_id:        int
    options:        List[str]
    correct_option: str
    difficulty:     str
    subject:        str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  ANSWER  (single question submit, outside quiz)
# ─────────────────────────────────────────────
class AnswerCreate(BaseModel):
    question_id:        int
    answer_text:        str
    time_taken_seconds: float = 0.0         # ✅ NEW


class AnswerResponse(BaseModel):
    id:                 int
    question_id:        int
    user_id:            int
    answer_text:        str
    is_correct:         bool                # ✅ now bool
    score:              int
    time_taken_seconds: float

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  QUIZ SESSION
# ─────────────────────────────────────────────
class QuizSessionResponse(BaseModel):
    id:        int
    user_id:   int
    course_id: int
    score:     int
    status:    str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  QUIZ SUBMIT  (bulk submit all answers at once)
# ─────────────────────────────────────────────
class QuizAnswer(BaseModel):
    question_id:        int
    answer:             str
    time_taken_seconds: float = 0.0         # ✅ per-question time


class QuizSubmitRequest(BaseModel):
    quiz_session_id: int
    answers:         List[QuizAnswer]


class QuizSubmitResponse(BaseModel):
    quiz_session_id: int
    user_id:         int
    total_score:     int
    correct:         int
    wrong:           int
    accuracy_pct:    float
    total_time_secs: float
    avg_time_secs:   float


# ─────────────────────────────────────────────
#  ANALYTICS  (returned to frontend)
# ─────────────────────────────────────────────
class SubjectStat(BaseModel):
    attempted: int
    correct:   int
    accuracy:  float


class AnalyticsResponse(BaseModel):
    user_id:               int
    total_attempted:       int
    total_correct:         int
    accuracy_score:        float
    avg_time_per_question: float
    speed_score:           float
    easy_correct:          int
    medium_correct:        int
    hard_correct:          int
    knowledge_score:       float
    streak_days:           int
    consistency_score:     float
    subject_breakdown:     Dict[str, SubjectStat]

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  STUDENT DNA REPORT
# ─────────────────────────────────────────────
class DNAReport(BaseModel):
    user_id:         int
    username:        str
    accuracy_score:  float
    speed_score:     float
    knowledge_score: float
    consistency_score: float
    overall_score:   float
    rank:            str          # Beginner / Learner / Skilled / Advanced / Expert / Master
    strengths:       List[str]
    weaknesses:      List[str]
    advice:          str
    subject_breakdown: Dict[str, SubjectStat]


# ─────────────────────────────────────────────
#  PHASE 3 — FRIENDS
# ─────────────────────────────────────────────
class FriendRequestCreate(BaseModel):
    receiver_id: int

class FriendRequestResponse(BaseModel):
    id:          int
    sender_id:   int
    receiver_id: int
    status:      str
    class Config:
        from_attributes = True

class UserPublicProfile(BaseModel):
    id:       int
    username: str
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  PHASE 3 — CHALLENGES
# ─────────────────────────────────────────────
class ChallengeCreate(BaseModel):
    opponent_id:    int
    course_id:      int
    mode:           str = "mixed"   # accuracy | speed | mixed
    question_count: int = 5

class ChallengeResponse(BaseModel):
    id:                  int
    challenger_id:       int
    opponent_id:         int
    course_id:           int
    mode:                str
    status:              str
    question_count:      int
    challenger_score:    Optional[int]   = None
    opponent_score:      Optional[int]   = None
    challenger_accuracy: Optional[float] = None
    opponent_accuracy:   Optional[float] = None
    challenger_time:     Optional[float] = None
    opponent_time:       Optional[float] = None
    winner_id:           Optional[int]   = None
    class Config:
        from_attributes = True

class ChallengeSubmitRequest(BaseModel):
    challenge_id:    int
    answers:         List[dict]   # [{question_id, answer, time_taken_seconds}]
    total_time_secs: float

class ChallengeResult(BaseModel):
    challenge_id:        int
    your_score:          int
    opponent_score:      Optional[int]
    your_accuracy:       float
    opponent_accuracy:   Optional[float]
    your_time:           float
    opponent_time:       Optional[float]
    winner_id:           Optional[int]
    status:              str
    elo_change:          int


# ─────────────────────────────────────────────
#  PHASE 3 — BADGES
# ─────────────────────────────────────────────
class BadgeResponse(BaseModel):
    id:          int
    name:        str
    description: str
    icon:        str
    condition:   str
    earned:      bool = False
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  PHASE 3 — ELO
# ─────────────────────────────────────────────
class EloResponse(BaseModel):
    user_id: int
    rating:  int
    wins:    int
    losses:  int
    draws:   int
    rank:    str   # Bronze/Silver/Gold/Platinum/Diamond
    class Config:
        from_attributes = True


class QuestionCreateAdmin(BaseModel):
    title:          str
    description:    str
    course_id:      int
    options:        List[str]
    correct_option: str
    difficulty:     str = "medium"   # easy | medium | hard
    subject:        str = "General"


class QuestionUpdateAdmin(BaseModel):
    title:          Optional[str] = None
    description:    Optional[str] = None
    options:        Optional[List[str]] = None
    correct_option: Optional[str] = None
    difficulty:     Optional[str] = None
    subject:        Optional[str] = None


class QuestionAdminResponse(BaseModel):
    id:             int
    title:          str
    description:    str
    course_id:      int
    course_title:   str
    options:        List[str]
    correct_option: str
    difficulty:     str
    subject:        str

    class Config:
        from_attributes = True


class BulkUploadRowError(BaseModel):
    row_number: int
    reason:     str


class BulkUploadResult(BaseModel):
    total_rows: int
    imported:   int
    skipped:    int
    errors:     List[BulkUploadRowError]
