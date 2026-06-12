from pydantic import BaseModel, EmailStr, Field
from typing import List, Dict


# ─────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# COURSE
# ─────────────────────────────────────────────
class CourseCreate(BaseModel):
    title: str
    description: str


class CourseResponse(BaseModel):
    id: int
    title: str
    description: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# LESSON
# ─────────────────────────────────────────────
class LessonCreate(BaseModel):
    title: str
    content: str
    course_id: int


class LessonResponse(BaseModel):
    id: int
    title: str
    content: str
    course_id: int

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# PROGRESS
# ─────────────────────────────────────────────
class ProgressResponse(BaseModel):
    id: int
    user_id: int
    lesson_id: int
    completed: bool

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# QUESTION
# ─────────────────────────────────────────────
class QuestionCreate(BaseModel):
    title: str
    description: str
    course_id: int

    options: List[str]

    correct_option: str

    difficulty: str = Field(
        default="medium",
        pattern="^(easy|medium|hard)$"
    )

    subject: str = "General"


class QuestionResponse(BaseModel):
    id: int
    title: str
    description: str
    course_id: int
    user_id: int
    options: List[str]
    correct_option: str
    difficulty: str
    subject: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# ANSWER
# ─────────────────────────────────────────────
class AnswerCreate(BaseModel):
    question_id: int
    answer_text: str
    time_taken_seconds: float = 0.0


class AnswerResponse(BaseModel):
    id: int
    question_id: int
    user_id: int
    answer_text: str
    is_correct: bool
    score: int
    time_taken_seconds: float

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# QUIZ SESSION
# ─────────────────────────────────────────────
class QuizSessionResponse(BaseModel):
    id: int
    user_id: int
    course_id: int
    score: int
    status: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# QUIZ SUBMIT
# ─────────────────────────────────────────────
class QuizAnswer(BaseModel):
    question_id: int
    answer: str
    time_taken_seconds: float = 0.0


class QuizSubmitRequest(BaseModel):
    quiz_session_id: int
    answers: List[QuizAnswer]


class QuizSubmitResponse(BaseModel):
    quiz_session_id: int
    user_id: int
    total_score: int
    correct: int
    wrong: int
    accuracy_pct: float
    total_time_secs: float
    avg_time_secs: float


# ─────────────────────────────────────────────
# ANALYTICS
# ─────────────────────────────────────────────
class SubjectStat(BaseModel):
    attempted: int
    correct: int
    accuracy: float


class AnalyticsResponse(BaseModel):
    user_id: int
    total_attempted: int
    total_correct: int
    accuracy_score: float

    avg_time_per_question: float
    speed_score: float

    easy_correct: int
    medium_correct: int
    hard_correct: int

    knowledge_score: float

    streak_days: int
    consistency_score: float

    subject_breakdown: Dict[str, SubjectStat]

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# STUDENT DNA REPORT
# ─────────────────────────────────────────────
class DNAReport(BaseModel):
    user_id: int
    username: str

    accuracy_score: float
    speed_score: float
    knowledge_score: float
    consistency_score: float

    overall_score: float

    rank: str

    strengths: List[str]
    weaknesses: List[str]

    advice: str

    subject_breakdown: Dict[str, SubjectStat]