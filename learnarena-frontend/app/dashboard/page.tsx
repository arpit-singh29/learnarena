"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { courseApi, analyticsApi, Course, Analytics } from "@/lib/api"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [courses, setCourses]     = useState<Course[]>([])
  const [myCourses, setMyCourses] = useState<Course[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [enrolling, setEnrolling]     = useState<number | null>(null)

  const isAdmin = user?.role === "admin"

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

        {/* Admin-only: manage question bank */}
        {isAdmin && (
          <Link
            href="/admin/questions"
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            📚 Manage questions
          </Link>
        )}
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
