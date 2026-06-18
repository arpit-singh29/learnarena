import axios from "axios"

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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

export interface Friend {
  id: number
  username: string
}

export interface SearchUser {
  id: number
  username: string
  friend_status: "none" | "pending" | "accepted" | "rejected"
}

export interface FriendRequest {
  id: number
  sender_id: number
  sender_username: string
  status: string
}

export interface ChallengeItem {
  id: number
  challenger_id: number
  challenger_username: string
  opponent_id: number
  opponent_username: string
  course_id: number
  mode: string
  status: string
  question_count: number
  challenger_score: number | null
  opponent_score: number | null
  winner_id: number | null
  is_mine: boolean
}

export interface ChallengeResult {
  challenge_id: number
  your_score: number
  opponent_score: number | null
  your_accuracy: number
  opponent_accuracy: number | null
  your_time: number
  opponent_time: number | null
  winner_id: number | null
  status: string
  elo_change: number
}

export interface BadgeItem {
  id: number
  name: string
  description: string
  icon: string
  condition: string
  earned: boolean
}

export interface EloRating {
  user_id: number
  rating: number
  wins: number
  losses: number
  draws: number
  rank: string
}

export interface NotificationItem {
  id: number
  type: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

// ── Auth ───────────────────────────────────────────────────────
export const authApi = {
  register: (username: string, email: string, password: string) =>
    api.post("/register", { username, email, password }),

  login: async (email: string, password: string) => {
    const form = new URLSearchParams()
    form.append("username", email)
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
  getAll:   () => api.get<Course[]>("/courses"),
  getById:  (id: number) => api.get<Course>(`/courses/${id}`),
  myCourses: () => api.get<Course[]>("/my-courses"),
  enroll:   (courseId: number) => api.post(`/enroll/${courseId}`),
  unenroll: (courseId: number) => api.delete(`/unenroll/${courseId}`),
}

// ── Questions ──────────────────────────────────────────────────
export const questionApi = {
  getByCourse: (courseId: number) => api.get<Question[]>(`/questions/${courseId}`),
  create: (data: {
    title: string; description: string; course_id: number
    options: string[]; correct_option: string; difficulty: string; subject: string
  }) => api.post("/questions", data),
  submitAnswer: (questionId: number, answerText: string, timeTaken: number) =>
    api.post("/answer", { question_id: questionId, answer_text: answerText, time_taken_seconds: timeTaken }),
}

// ── Quiz ───────────────────────────────────────────────────────
export const quizApi = {
  start:  (courseId: number) => api.post<QuizStartResponse>(`/quiz/start/${courseId}`),
  submit: (quizSessionId: number, answers: { question_id: number; answer: string; time_taken_seconds: number }[]) =>
    api.post<QuizSubmitResponse>("/quiz/submit", { quiz_session_id: quizSessionId, answers }),
}

// ── Analytics ──────────────────────────────────────────────────
export const analyticsApi = {
  me:   () => api.get<Analytics>("/analytics/me"),
  dna:  () => api.get<DNAReport>("/analytics/dna"),
  user: (userId: number) => api.get<Analytics>(`/analytics/user/${userId}`),
}

// ── Leaderboard ────────────────────────────────────────────────
export const leaderboardApi = {
  get: () => api.get<LeaderboardEntry[]>("/leaderboard"),
}

// ── Friends ────────────────────────────────────────────────────
export const friendsApi = {
  search:      (q: string) => api.get<SearchUser[]>(`/friends/search?q=${q}`),
  sendRequest: (receiver_id: number) => api.post("/friends/request", { receiver_id }),
  incoming:    () => api.get<FriendRequest[]>("/friends/requests/incoming"),
  accept:      (id: number) => api.post(`/friends/request/${id}/accept`),
  reject:      (id: number) => api.post(`/friends/request/${id}/reject`),
  list:        () => api.get<Friend[]>("/friends/list"),
  remove:      (id: number) => api.delete(`/friends/${id}`),
}

// ── Challenges ─────────────────────────────────────────────────
export const challengeApi = {
  create:    (data: { opponent_id: number; course_id: number; mode: string; question_count: number }) =>
               api.post<ChallengeItem>("/challenges/create", data),
  my:        () => api.get<ChallengeItem[]>("/challenges/my"),
  accept:    (id: number) => api.post(`/challenges/${id}/accept`),
  decline:   (id: number) => api.post(`/challenges/${id}/decline`),
  questions: (id: number) => api.get<Question[]>(`/challenges/${id}/questions`),
  submit:    (challenge_id: number, answers: object[], total_time_secs: number) =>
               api.post<ChallengeResult>("/challenges/submit", { challenge_id, answers, total_time_secs }),
  myElo:     () => api.get<EloRating>("/challenges/elo/me"),
  eloLeaderboard: () => api.get<EloLeaderboardEntry[]>("/challenges/elo/leaderboard"),
}

// ── Badges ─────────────────────────────────────────────────────
export const badgesApi = {
  me: () => api.get<BadgeItem[]>("/badges/me"),
}

// ── Notifications ──────────────────────────────────────────────
export const notificationsApi = {
  getAll:      () => api.get<NotificationItem[]>("/notifications/"),
  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
  markAllRead: () => api.post("/notifications/mark-all-read"),
  markOneRead: (id: number) => api.post(`/notifications/${id}/read`),
}

export default api


// ── Profile Type ───────────────────────────────────────────────
export interface ProfileData {
  id: number
  username: string
  joined: string
  elo_rating: number
  elo_rank: string
  wins: number
  losses: number
  draws: number
  total_attempted: number
  total_correct: number
  accuracy_score: number
  speed_score: number
  knowledge_score: number
  streak_days: number
  hard_correct: number
  subject_breakdown: Record<string, SubjectStat>
  badges: { name: string; icon: string; description: string }[]
  friend_status: "self" | "friends" | "not_friends"
}

// ── Profile API ────────────────────────────────────────────────
export const profileApi = {
  get: (username: string) => api.get<ProfileData>(`/profile/${username}`),
}


// ── ELO Leaderboard Type ───────────────────────────────────────
export interface EloLeaderboardEntry {
  user_id: number
  username: string
  rating: number
  rank: string
  wins: number
  losses: number
  draws: number
}



// ── Admin Question Types ─────────────────────────────────────
export interface AdminQuestion {
  id: number
  title: string
  description: string
  course_id: number
  course_title: string
  options: string[]
  correct_option: string
  difficulty: "easy" | "medium" | "hard"
  subject: string
}

export interface AdminQuestionListResponse {
  total: number
  items: AdminQuestion[]
}

export interface BulkUploadRowError {
  row_number: number
  reason: string
}

export interface BulkUploadResult {
  total_rows: number
  imported: number
  skipped: number
  errors: BulkUploadRowError[]
}

// ── Admin Questions API ────────────────────────────────────────
export const adminQuestionsApi = {
  list: (params?: { course_id?: number; search?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.course_id) q.append("course_id", String(params.course_id))
    if (params?.search)    q.append("search", params.search)
    if (params?.skip)      q.append("skip", String(params.skip))
    if (params?.limit)     q.append("limit", String(params.limit))
    return api.get<AdminQuestionListResponse>(`/admin/questions/?${q.toString()}`)
  },

  create: (data: {
    title: string; description: string; course_id: number
    options: string[]; correct_option: string; difficulty: string; subject: string
  }) => api.post("/admin/questions/", data),

  update: (id: number, data: Partial<{
    title: string; description: string
    options: string[]; correct_option: string; difficulty: string; subject: string
  }>) => api.put(`/admin/questions/${id}`, data),

  remove: (id: number) => api.delete(`/admin/questions/${id}`),

  bulkUpload: (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return api.post<BulkUploadResult>("/admin/questions/bulk-upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  },
}
