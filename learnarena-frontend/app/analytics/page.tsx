"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { analyticsApi, Analytics } from "@/lib/api"
import ScoreCard from "@/components/ScoreCard"

export default function AnalyticsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<Analytics | null>(null)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    analyticsApi.me()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setPageLoading(false))
  }, [user])

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const subjects = Object.entries(data.subject_breakdown)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Your analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            {data.total_attempted} questions attempted · {data.total_correct} correct
          </p>
        </div>
        <Link
          href="/dna"
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
        >
          🧬 DNA Report
        </Link>
      </div>

      {/* 4 score rings */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <ScoreCard
          label="Accuracy"
          score={data.accuracy_score}
          color="text-indigo-600"
          ringColor="#6366f1"
          description={`${data.total_correct}/${data.total_attempted} correct`}
        />
        <ScoreCard
          label="Speed"
          score={data.speed_score}
          color="text-emerald-600"
          ringColor="#10b981"
          description={`Avg ${data.avg_time_per_question.toFixed(1)}s / question`}
        />
        <ScoreCard
          label="Knowledge"
          score={data.knowledge_score}
          color="text-amber-600"
          ringColor="#f59e0b"
          description="Weighted by difficulty"
        />
        <ScoreCard
          label="Consistency"
          score={data.consistency_score}
          color="text-rose-600"
          ringColor="#f43f5e"
          description={`${data.streak_days} active days`}
        />
      </div>

      {/* Difficulty breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="font-bold text-slate-800 mb-4">Questions by difficulty</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Easy", count: data.easy_correct, color: "bg-green-100 text-green-700", bar: "bg-green-400" },
            { label: "Medium", count: data.medium_correct, color: "bg-amber-100 text-amber-700", bar: "bg-amber-400" },
            { label: "Hard", count: data.hard_correct, color: "bg-red-100 text-red-700", bar: "bg-red-400" },
          ].map(({ label, count, color, bar }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>{label}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${bar}`}
                  style={{ width: `${Math.min((count / Math.max(data.total_correct, 1)) * 100, 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-700 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subject breakdown */}
      {subjects.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Subject breakdown</h2>
          <div className="space-y-3">
            {subjects.map(([subject, stat]) => (
              <div key={subject}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{subject}</span>
                  <span className="text-xs text-slate-400">
                    {stat.correct}/{stat.attempted} · {stat.accuracy.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${stat.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subjects.length === 0 && data.total_attempted === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">No data yet.</p>
          <p className="text-sm mt-1">Solve some questions to see your analytics.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-brand-600 font-medium hover:underline">
            Go to dashboard →
          </Link>
        </div>
      )}
    </div>
  )
}
