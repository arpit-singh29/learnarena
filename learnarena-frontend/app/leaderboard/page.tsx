"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { leaderboardApi, LeaderboardEntry } from "@/lib/api"

const MEDALS = ["🥇", "🥈", "🥉"]

export default function LeaderboardPage() {
  const [board, setBoard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    leaderboardApi.get()
      .then((res) => setBoard(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-slate-900">🏆 Leaderboard</h1>
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          Dashboard →
        </Link>
      </div>

      {board.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🏆</p>
          <p className="font-medium">No scores yet.</p>
          <p className="text-sm mt-1">Be the first to solve questions!</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {board.map((entry, idx) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-4 px-6 py-4 ${idx !== board.length - 1 ? "border-b border-slate-100" : ""} ${idx < 3 ? "bg-gradient-to-r from-white to-brand-50/30" : ""}`}
            >
              {/* Rank */}
              <span className="text-xl w-8 text-center shrink-0">
                {idx < 3 ? MEDALS[idx] : <span className="text-sm text-slate-400 font-bold">#{idx + 1}</span>}
              </span>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                {entry.username.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{entry.username}</p>
                <p className="text-xs text-slate-400">{entry.correct_answers} correct answers</p>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <p className="font-black text-lg text-slate-900">{entry.total_score}</p>
                <p className="text-xs text-slate-400">pts</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
