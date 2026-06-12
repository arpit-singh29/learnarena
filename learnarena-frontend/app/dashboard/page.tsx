"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { courseApi, questionApi, analyticsApi, Course, Analytics } from "@/lib/api"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [courses, setCourses] = useState<Course[]>([])
  const [myCourses, setMyCourses] = useState<Course[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [enrolling, setEnrolling] = useState<number | null>(null)

  // Upload question state
  const [showUpload, setShowUpload] = useState(false)
  const [qForm, setQForm] = useState({
    title: "",
    description: "",
    course_id: "",
    options: ["", "", "", ""],
    correct_option: "",
    difficulty: "medium",
    subject: "",
  })
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState("")

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    Promise.all([
      courseApi.getAll(),
      courseApi.myCourses(),
      analyticsApi.me(),
    ])
      .then(([allRes, myRes, analyticsRes]) => {
        setCourses(allRes.data)
        setMyCourses(myRes.data)
        setAnalytics(analyticsRes.data)
      })
      .catch(() => {})
      .finally(() => setPageLoading(false))
  }, [user])

  const handleEnroll = async (courseId: number) => {
    setEnrolling(courseId)
    try {
      await courseApi.enroll(courseId)
      const myRes = await courseApi.myCourses()
      setMyCourses(myRes.data)
    } catch {}
    setEnrolling(null)
  }

  const handleOptionChange = (idx: number, val: string) => {
    const opts = [...qForm.options]
    opts[idx] = val
    setQForm((p) => ({ ...p, options: opts }))
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    setUploadMsg("")
    try {
      await questionApi.create({
        title: qForm.title,
        description: qForm.description,
        course_id: Number(qForm.course_id),
        options: qForm.options.filter(Boolean),
        correct_option: qForm.correct_option,
        difficulty: qForm.difficulty,
        subject: qForm.subject,
      })
      setUploadMsg("Question uploaded successfully!")
      setQForm({ title: "", description: "", course_id: "", options: ["", "", "", ""], correct_option: "", difficulty: "medium", subject: "" })
      setShowUpload(false)
    } catch (err: any) {
      setUploadMsg(err?.response?.data?.detail || "Upload failed.")
    }
    setUploading(false)
  }

  const enrolledIds = new Set(myCourses.map((c) => c.id))

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Welcome back, {user?.username} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {analytics?.total_attempted ?? 0} questions solved so far
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          + Upload question
        </button>
      </div>

      {/* Quick stats bar */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Accuracy", value: `${analytics.accuracy_score.toFixed(1)}%`, color: "text-indigo-600" },
            { label: "Speed score", value: `${analytics.speed_score.toFixed(1)}`, color: "text-emerald-600" },
            { label: "Knowledge", value: `${analytics.knowledge_score.toFixed(1)}`, color: "text-amber-600" },
            { label: "Streak", value: `${analytics.streak_days}d`, color: "text-rose-600" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm"
            >
              <p className="text-xs text-slate-400 font-medium">{label}</p>
              <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/analytics"
          className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
        >
          📊 Full analytics
        </Link>
        <Link
          href="/dna"
          className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
        >
          🧬 My DNA report
        </Link>
        <Link
          href="/leaderboard"
          className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
        >
          🏆 Leaderboard
        </Link>
      </div>

      {/* Upload question form */}
      {showUpload && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4">Upload a question</h2>
          {uploadMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${uploadMsg.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {uploadMsg}
            </div>
          )}
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Title</label>
                <input value={qForm.title} onChange={(e) => setQForm((p) => ({ ...p, title: e.target.value }))} required placeholder="Question title" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Subject</label>
                <input value={qForm.subject} onChange={(e) => setQForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Maths, Physics…" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Description / question body</label>
              <textarea value={qForm.description} onChange={(e) => setQForm((p) => ({ ...p, description: e.target.value }))} required rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {qForm.options.map((opt, i) => (
                <div key={i}>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Option {i + 1}</label>
                  <input value={opt} onChange={(e) => handleOptionChange(i, e.target.value)} placeholder={`Option ${i + 1}`} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Correct answer</label>
                <input value={qForm.correct_option} onChange={(e) => setQForm((p) => ({ ...p, correct_option: e.target.value }))} required placeholder="Exact text of correct option" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Difficulty</label>
                <select value={qForm.difficulty} onChange={(e) => setQForm((p) => ({ ...p, difficulty: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Course</label>
                <select value={qForm.course_id} onChange={(e) => setQForm((p) => ({ ...p, course_id: e.target.value }))} required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                  <option value="">Select course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={uploading} className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60">
                {uploading ? "Uploading…" : "Upload question"}
              </button>
              <button type="button" onClick={() => setShowUpload(false)} className="px-5 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My enrolled courses */}
      {myCourses.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-slate-800 mb-4">My courses</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800">{course.title}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{course.description}</p>
                <Link
                  href={`/quiz/${course.id}`}
                  className="mt-4 inline-block px-4 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-xs font-semibold hover:bg-brand-100 transition-colors"
                >
                  Start quiz →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All courses / enroll */}
      <div>
        <h2 className="font-bold text-slate-800 mb-4">All courses</h2>
        {courses.length === 0 ? (
          <p className="text-slate-400 text-sm">No courses available yet. Ask an admin to create one.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => {
              const enrolled = enrolledIds.has(course.id)
              return (
                <div key={course.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800">{course.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{course.description}</p>
                  </div>
                  <div className="mt-4">
                    {enrolled ? (
                      <span className="inline-block px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                        ✓ Enrolled
                      </span>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={enrolling === course.id}
                        className="px-4 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60"
                      >
                        {enrolling === course.id ? "Enrolling…" : "Enroll"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
