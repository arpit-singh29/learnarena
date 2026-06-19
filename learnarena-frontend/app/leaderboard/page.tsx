"use client"
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import Link from "next/link"
import { leaderboardApi, challengeApi, LeaderboardEntry, EloLeaderboardEntry } from "@/lib/api"

const MEDALS = ["🥇", "🥈", "🥉"]

const ELO_RANK_STYLE: Record<string, string> = {
  Bronze:   "bg-amber-100 text-amber-700",
  Silver:   "bg-slate-100 text-slate-600",
  Gold:     "bg-yellow-100 text-yellow-700",
  Platinum: "bg-cyan-100 text-cyan-700",
  Diamond:  "bg-purple-100 text-purple-700",
}

type Tab = "quiz" | "elo"

export default function LeaderboardPage() {
  const [tab, setTab]           = useState<Tab>("quiz")
  const [board, setBoard]       = useState<LeaderboardEntry[]>([])
  const [eloBoard, setEloBoard] = useState<EloLeaderboardEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [eloLoading, setEloLoading] = useState(true)

  useEffect(() => {
    leaderboardApi.get()
      .then((res) => setBoard(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))

    challengeApi.eloLeaderboard()
      .then((res) => setEloBoard(res.data))
      .catch(() => {})
      .finally(() => setEloLoading(false))
  }, [])

  const isLoading = tab === "quiz" ? loading : eloLoading

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-900">🏆 Leaderboard</h1>
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          Dashboard →
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab("quiz")}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === "quiz" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}>
          📚 Quiz Score
        </button>
        <button onClick={() => setTab("elo")}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === "elo" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}>
          ⚔️ ELO Rank
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
        </div>
      ) : tab === "quiz" ? (
        // ── QUIZ LEADERBOARD ─────────────────────────────────
        board.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">🏆</p>
            <p className="font-medium">No scores yet.</p>
            <p className="text-sm mt-1">Be the first to solve questions!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {board.map((entry, idx) => (
              <Link
                key={entry.user_id}
                href={`/profile/${entry.username}`}
                className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors ${idx !== board.length - 1 ? "border-b border-slate-100" : ""} ${idx < 3 ? "bg-gradient-to-r from-white to-brand-50/30" : ""}`}
              >
                <span className="text-xl w-8 text-center shrink-0">
                  {idx < 3 ? MEDALS[idx] : <span className="text-sm text-slate-400 font-bold">#{idx + 1}</span>}
                </span>

                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                  {entry.username.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{entry.username}</p>
                  <p className="text-xs text-slate-400">{entry.correct_answers} correct answers</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-black text-lg text-slate-900">{entry.total_score}</p>
                  <p className="text-xs text-slate-400">pts</p>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        // ── ELO LEADERBOARD ──────────────────────────────────
        eloBoard.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">⚔️</p>
            <p className="font-medium">No challenges played yet.</p>
            <p className="text-sm mt-1">Challenge a friend to start ranking up!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {eloBoard.map((entry, idx) => (
              <Link
                key={entry.user_id}
                href={`/profile/${entry.username}`}
                className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors ${idx !== eloBoard.length - 1 ? "border-b border-slate-100" : ""} ${idx < 3 ? "bg-gradient-to-r from-white to-indigo-50/30" : ""}`}
              >
                <span className="text-xl w-8 text-center shrink-0">
                  {idx < 3 ? MEDALS[idx] : <span className="text-sm text-slate-400 font-bold">#{idx + 1}</span>}
                </span>

                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                  {entry.username.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{entry.username}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${ELO_RANK_STYLE[entry.rank] ?? "bg-slate-100 text-slate-600"}`}>
                      {entry.rank}
                    </span>
                    <span className="text-xs text-slate-400">
                      {entry.wins}W {entry.losses}L {entry.draws}D
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-black text-lg text-slate-900">{entry.rating}</p>
                  <p className="text-xs text-slate-400">ELO</p>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  )
}
