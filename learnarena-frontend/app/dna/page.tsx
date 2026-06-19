"use client"
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { analyticsApi, DNAReport } from "@/lib/api"

const RANK_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Beginner: { bg: "bg-slate-100",  text: "text-slate-600",  border: "border-slate-200" },
  Learner:  { bg: "bg-blue-50",    text: "text-blue-600",   border: "border-blue-200"  },
  Skilled:  { bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200" },
  Advanced: { bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200" },
  Expert:   { bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-200"},
  Master:   { bg: "bg-rose-50",    text: "text-rose-700",   border: "border-rose-200"  },
}

const RANK_EMOJI: Record<string, string> = {
  Beginner: "🌱", Learner: "📚", Skilled: "⚡",
  Advanced: "🔥", Expert: "🎯", Master: "🏆",
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="text-sm font-bold text-slate-800">{score.toFixed(1)}</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}/>
      </div>
    </div>
  )
}

export default function DNAPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [report, setReport]           = useState<DNAReport | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError]             = useState("")

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    analyticsApi.dna()
      .then(res => setReport(res.data))
      .catch(err => {
        const detail = err?.response?.data?.detail
        setError(detail || "Could not load your DNA report. Try solving some questions first.")
      })
      .finally(() => setPageLoading(false))
  }, [user])

  if (loading || pageLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin"/>
      <p className="text-sm text-slate-400">Building your DNA report…</p>
    </div>
  )

  if (error) return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">🧬</p>
        <h2 className="font-bold text-slate-700 mb-2">Report not ready yet</h2>
        <p className="text-sm text-slate-400 mb-6">{error}</p>
        <Link href="/dashboard"
          className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors">
          Go solve some questions →
        </Link>
      </div>
    </div>
  )

  if (!report) return null

  const rankStyle = RANK_STYLES[report.rank] ?? RANK_STYLES.Beginner
  const rankEmoji = RANK_EMOJI[report.rank]  ?? "🌱"
  const subjects  = Object.entries(report.subject_breakdown)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 mb-6 text-center">
        <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">
          Student DNA Report
        </p>

        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border text-lg font-black mb-4 ${rankStyle.bg} ${rankStyle.text} ${rankStyle.border}`}>
          {rankEmoji} {report.rank}
        </div>

        <h1 className="text-3xl font-black text-slate-900">{report.username}</h1>

        {/* Overall score ring */}
        <div className="flex justify-center mt-4">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#6366f1" strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(report.overall_score / 100) * 251.2} 251.2`}/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-900">{report.overall_score.toFixed(0)}</span>
              <span className="text-xs text-slate-400">overall</span>
            </div>
          </div>
        </div>
      </div>

      {/* Score bars */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="font-bold text-slate-800 mb-5">Score breakdown</h2>
        <div className="space-y-4">
          <ScoreBar label="Accuracy"    score={report.accuracy_score}    color="bg-indigo-500"/>
          <ScoreBar label="Speed"       score={report.speed_score}       color="bg-emerald-500"/>
          <ScoreBar label="Knowledge"   score={report.knowledge_score}   color="bg-amber-500"/>
          <ScoreBar label="Consistency" score={report.consistency_score} color="bg-rose-500"/>
        </div>
      </div>

      {/* Strengths & weaknesses */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 rounded-2xl border border-green-100 p-6">
          <h2 className="font-bold text-green-800 mb-3">💪 Strengths</h2>
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                <span className="mt-0.5 text-green-500 shrink-0">✓</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
          <h2 className="font-bold text-red-800 mb-3">⚠️ Areas to improve</h2>
          <ul className="space-y-2">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                <span className="mt-0.5 text-red-400 shrink-0">→</span>{w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Advice */}
      <div className="bg-brand-50 rounded-2xl border border-brand-100 p-6 mb-6">
        <h2 className="font-bold text-brand-800 mb-2">💡 Personalized advice</h2>
        <p className="text-sm text-brand-700 leading-relaxed">{report.advice}</p>
      </div>

      {/* Subject breakdown */}
      {subjects.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <h2 className="font-bold text-slate-800 mb-4">Subject performance</h2>
          <div className="space-y-3">
            {subjects.map(([subject, stat]) => {
              const acc   = stat.accuracy ?? 0
              const color = acc >= 80 ? "bg-green-500" : acc >= 50 ? "bg-amber-500" : "bg-red-400"
              return (
                <div key={subject}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{subject}</span>
                    <span className="text-xs text-slate-400">
                      {stat.correct}/{stat.attempted} · {acc.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${acc}%` }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex gap-3 justify-center">
        <Link href="/dashboard"
          className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors">
          Keep solving questions
        </Link>
        <Link href="/analytics"
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors">
          Full analytics
        </Link>
      </div>
    </div>
  )
}
