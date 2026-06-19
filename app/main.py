from fastapi               import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database          import Base, engine, SessionLocal

from app.routes.auth       import router as auth_router
from app.routes.user       import router as user_router
from app.routes.admin      import router as admin_router

from app.routes.course     import router as course_router
from app.routes.enrollment import router as enrollment_router
from app.routes.lesson     import router as lesson_router

from app.routes.progress   import router as progress_router
from app.routes.question   import router as question_router
from app.routes.analytics  import router as analytics_router

from app.routes.friends    import router as friends_router
from app.routes.challenge  import router as challenge_router
from app.routes.badges     import router as badges_router

from app.routes            import leaderboard, quiz
from app.routes            import notifications
from app.routes            import profile

from app.routes            import admin_questions


# Create all tables
Base.metadata.create_all(bind=engine)

# Seed badges on startup
from app.services.badge_service import seed_badges
_db = SessionLocal()
try:
    seed_badges(_db)
finally:
    _db.close()

app = FastAPI(
    title="LearnArena API",
    description="Student Performance Intelligence System",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://learnarena-tnfv.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(admin_router)
app.include_router(course_router)
app.include_router(enrollment_router)
app.include_router(lesson_router)
app.include_router(progress_router)
app.include_router(question_router)
app.include_router(analytics_router)
app.include_router(friends_router)
app.include_router(challenge_router)
app.include_router(badges_router)
app.include_router(leaderboard.router)
app.include_router(quiz.router)
app.include_router(notifications.router)
app.include_router(profile.router)
app.include_router(admin_questions.router)

@app.get("/")
def home():
    return {"message": "LearnArena API 🚀", "version": "3.0.0", "docs": "/docs"}

