import axios from "axios"

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ── axios instance ─────────────────────────────────────────────
const api = axios.create({ baseURL: BASE })

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Types (mirrors your FastAPI schemas exactly) ───────────────
export interface User {
  id: number
  username: string
  email: string
  role: string
}

export interface Course {
  id: number
  title: string
  description: string
}

export interface Question {
  id: number
  title: string
  description: string
  options: string[]
  difficulty: "easy" | "medium" | "hard"
  subject: string
}

export interface SubjectStat {
  attempted: number
  correct: number
  accuracy: number
}

export interface Analytics {
  user_id: number
  total_attempted: number
  total_correct: number
  accuracy_score: number
  avg_time_per_question: number
  speed_score: number
  easy_correct: number
  medium_correct: number
  hard_correct: number
  knowledge_score: number
  streak_days: number
  consistency_score: number
  subject_breakdown: Record<string, SubjectStat>
}

export interface DNAReport {
  user_id: number
  username: string
  accuracy_score: number
  speed_score: number
  knowledge_score: number
  consistency_score: number
  overall_score: number
  rank: string
  strengths: string[]
  weaknesses: string[]
  advice: string
  subject_breakdown: Record<string, SubjectStat>
}

export interface LeaderboardEntry {
  user_id: number
  username: string
  total_score: number
  correct_answers: number
}

export interface QuizStartResponse {
  quiz_session_id: number
  course_id: number
  total_questions: number
  questions: Question[]
  message: string
}

export interface QuizSubmitResponse {
  quiz_session_id: number
  user_id: number
  total_score: number
  correct: number
  wrong: number
  accuracy_pct: number
  total_time_secs: number
  avg_time_secs: number
}

// ── Auth ───────────────────────────────────────────────────────
export const authApi = {
  register: (username: string, email: string, password: string) =>
    api.post("/register", { username, email, password }),

  // FastAPI OAuth2PasswordRequestForm needs form-urlencoded, not JSON
  login: async (email: string, password: string) => {
    const form = new URLSearchParams()
    form.append("username", email)   // FastAPI uses "username" field for email
    form.append("password", password)
    const res = await api.post("/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
    return res.data as { access_token: string; refresh_token: string; token_type: string }
  },

  logout: () => api.post("/logout"),

  me: () => api.get<User>("/me"),
}

// ── Courses ────────────────────────────────────────────────────
export const courseApi = {
  getAll: () => api.get<Course[]>("/courses"),
  getById: (id: number) => api.get<Course>(`/courses/${id}`),
  myCourses: () => api.get<Course[]>("/my-courses"),
  enroll: (courseId: number) => api.post(`/enroll/${courseId}`),
  unenroll: (courseId: number) => api.delete(`/unenroll/${courseId}`),
}

// ── Questions ──────────────────────────────────────────────────
export const questionApi = {
  getByCourse: (courseId: number) =>
    api.get<Question[]>(`/questions/${courseId}`),

  create: (data: {
    title: string
    description: string
    course_id: number
    options: string[]
    correct_option: string
    difficulty: string
    subject: string
  }) => api.post("/questions", data),

  submitAnswer: (questionId: number, answerText: string, timeTaken: number) =>
    api.post("/answer", {
      question_id: questionId,
      answer_text: answerText,
      time_taken_seconds: timeTaken,
    }),
}

// ── Quiz ───────────────────────────────────────────────────────
export const quizApi = {
  start: (courseId: number) =>
    api.post<QuizStartResponse>(`/quiz/start/${courseId}`),

  submit: (
    quizSessionId: number,
    answers: { question_id: number; answer: string; time_taken_seconds: number }[]
  ) =>
    api.post<QuizSubmitResponse>("/quiz/submit", {
      quiz_session_id: quizSessionId,
      answers,
    }),
}

// ── Analytics ──────────────────────────────────────────────────
export const analyticsApi = {
  me: () => api.get<Analytics>("/analytics/me"),
  dna: () => api.get<DNAReport>("/analytics/dna"),
  user: (userId: number) => api.get<Analytics>(`/analytics/user/${userId}`),
}

// ── Leaderboard ────────────────────────────────────────────────
export const leaderboardApi = {
  get: () => api.get<LeaderboardEntry[]>("/leaderboard"),
}

export default api
