from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

from app.routes.auth       import router as auth_router
from app.routes.user       import router as user_router
from app.routes.admin      import router as admin_router
from app.routes.course     import router as course_router
from app.routes.enrollment import router as enrollment_router
from app.routes.lesson     import router as lesson_router
from app.routes.progress   import router as progress_router
from app.routes.question   import router as question_router
from app.routes.analytics  import router as analytics_router
from app.routes            import leaderboard
from app.routes            import quiz

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LearnArena API",
    description="Student Performance Intelligence System",
    version="2.0.0"
)

# CORS — allow frontend (Next.js on 3000) to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(admin_router)
app.include_router(course_router)
app.include_router(enrollment_router)
app.include_router(lesson_router)
app.include_router(progress_router)
app.include_router(question_router)
app.include_router(analytics_router)
app.include_router(leaderboard.router)
app.include_router(quiz.router)


@app.get("/")
def home():
    return {
        "message": "LearnArena API 🚀",
        "version": "2.0.0",
        "docs":    "/docs"
    }