LearnArena – Student Performance Intelligence System

Overview

LearnArena is a modern Learning Management System (LMS) backend built with FastAPI and SQLAlchemy.

The project goes beyond traditional LMS platforms by tracking student performance, quiz behavior, learning speed, consistency, and subject-wise strengths to generate advanced analytics and a personalized Student DNA Report.

⸻

Features

Authentication & Security

* User Registration
* User Login
* JWT Access Tokens
* JWT Refresh Tokens
* Logout System
* Password Hashing with BCrypt
* Role-Based Access Control (RBAC)
* Admin and Student Roles

⸻

Course Management

* Create Courses
* View Courses
* Update Courses
* Delete Courses
* Enroll in Courses
* Unenroll from Courses
* View My Courses

⸻

Lesson Management

* Create Lessons
* View Lessons by Course
* Mark Lessons as Completed
* Track Course Progress

⸻

Progress Tracking

* Track Lesson Completion
* Calculate Course Completion Percentage
* Student Progress Dashboard

⸻

Question Bank

* Create Questions
* Multiple Choice Questions (MCQs)
* Subject Categorization
* Difficulty Levels
    * Easy
    * Medium
    * Hard

⸻

Quiz Engine

* Start Quiz Sessions
* Submit Answers
* Automatic Evaluation
* Score Calculation
* Accuracy Tracking
* Time Tracking

⸻

Analytics Engine

* Total Questions Attempted
* Accuracy Score
* Speed Score
* Knowledge Score
* Subject-wise Performance
* Difficulty-wise Analysis
* Learning Insights

⸻

Student DNA Report

The Student DNA Report analyzes:

* Accuracy
* Speed
* Consistency
* Knowledge Depth
* Subject Strengths
* Subject Weaknesses

Ranks students as:

* Beginner
* Learner
* Skilled
* Advanced
* Expert
* Master

⸻

Leaderboard

* Global Ranking
* Student Scores
* Competitive Performance Tracking

⸻

Tech Stack

Backend

* FastAPI
* SQLAlchemy ORM
* SQLite

Authentication

* JWT
* Passlib
* BCrypt

Validation

* Pydantic

API Testing

* Swagger UI

⸻

Project Structure

app/

├── main.py

├── database.py

├── models.py

├── schemas.py

├── config.py

│

├── routes/

│ ├── auth.py

│ ├── user.py

│ ├── course.py

│ ├── lesson.py

│ ├── question.py

│ ├── quiz.py

│ ├── analytics.py

│ └── leaderboard.py

│

├── services/

│ ├── user_service.py

│ ├── course_service.py

│ ├── lesson_service.py

│ ├── question_service.py

│ ├── progress_service.py

│ ├── analytics_service.py

│ └── leaderboard_service.py

│

└── utils/

⸻

Installation

Clone the repository:

git clone https://github.com/arpit-singh29/learnarena.git
cd learnarena

Create virtual environment:

python -m venv venv
source venv/bin/activate

Install dependencies:

pip install -r requirements.txt

Run server:

uvicorn app.main:app --reload

Open:

http://127.0.0.1:8000/docs

⸻

Current Status

Phase 1 Foundation Completed

Implemented:

* Authentication
* RBAC
* Courses
* Lessons
* Enrollment
* Progress Tracking
* Question Bank
* Quiz Engine
* Analytics Foundation
* Student DNA Foundation
* Leaderboard Foundation

⸻

Future Enhancements

* PostgreSQL Migration
* Redis Caching
* Celery Background Tasks
* Email Notifications
* AI-Based Learning Recommendations
* Frontend Dashboard
* Docker Deployment
* AWS Deployment
* CI/CD Pipeline

⸻

Author

Arpit Singh

Backend Project: LearnArena

Built using FastAPI, SQLAlchemy, JWT Authentication, and Python.