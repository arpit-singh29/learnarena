"use client"
import Link from "next/link"

interface ChallengeCardProps {
  id: number
  challenger_username: string
  opponent_username: string
  challenger_id: number
  opponent_id: number
  mode: string
  status: string
  question_count: number
  challenger_score: number | null
  opponent_score: number | null
  winner_id: number | null
  currentUserId: number
  onAccept?: (id: number) => void
  onDecline?: (id: number) => void
}

const MODE_INFO: Record<string, { label: string; icon: string }> = {
  accuracy: { label: "Accuracy Battle", icon: "🎯" },
  speed:    { label: "Speed Battle",    icon: "⚡" },
  mixed:    { label: "Mixed Mode",      icon: "🔥" },
}

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  active:    "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  declined:  "bg-red-100 text-red-600",
}

export default function ChallengeCard({
  id,
  challenger_username,
  opponent_username,
  challenger_id,
  opponent_id,
  mode,
  status,
  question_count,
  challenger_score,
  opponent_score,
  winner_id,
  currentUserId,
  onAccept,
  onDecline,
}: ChallengeCardProps) {
  const isChallenger = challenger_id === currentUserId
  const opponent     = isChallenger ? opponent_username : challenger_username
  const myScore      = isChallenger ? challenger_score : opponent_score
  const theirScore   = isChallenger ? opponent_score   : challenger_score
  const iWon         = winner_id === currentUserId
  const isDraw       = status === "completed" && winner_id === null
  const modeInfo     = MODE_INFO[mode] ?? { label: mode, icon: "🎮" }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 transition-shadow hover:shadow-md ${
      status === "pending"   ? "border-amber-200"
      : status === "active"  ? "border-blue-200"
      : status === "completed" && iWon ? "border-emerald-200"
      : status === "completed" && !iWon && !isDraw ? "border-red-200"
      : "border-slate-100"
    }`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{modeInfo.icon}</span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              vs <span className="text-brand-600">{opponent}</span>
            </p>
            <p className="text-xs text-slate-400">{modeInfo.label} · {question_count} questions</p>
          </div>
        </div>

        {/* Status badge */}
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600"}`}>
          {status === "completed"
            ? iWon ? "Won 🏆" : isDraw ? "Draw 🤝" : "Lost"
            : status.charAt(0).toUpperCase() + status.slice(1)
          }
        </span>
      </div>

      {/* Score row — only when completed */}
      {status === "completed" && (
        <div className="flex items-center gap-3 mb-3 bg-slate-50 rounded-xl p-3">
          <div className="text-center flex-1">
            <p className="text-xs text-slate-400 mb-0.5">You</p>
            <p className={`text-2xl font-black ${iWon ? "text-emerald-600" : "text-slate-700"}`}>
              {myScore ?? 0}
            </p>
          </div>
          <span className="text-slate-300 font-bold text-lg">vs</span>
          <div className="text-center flex-1">
            <p className="text-xs text-slate-400 mb-0.5">{opponent}</p>
            <p className={`text-2xl font-black ${!iWon && !isDraw ? "text-emerald-600" : "text-slate-700"}`}>
              {theirScore ?? "—"}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {status === "pending" && !isChallenger && onAccept && onDecline && (
          <>
            <button
              onClick={() => onAccept(id)}
              className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              Accept ✓
            </button>
            <button
              onClick={() => onDecline(id)}
              className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Decline
            </button>
          </>
        )}

        {status === "pending" && isChallenger && (
          <p className="text-xs text-amber-600 font-semibold py-2">
            ⏳ Waiting for {opponent} to accept…
          </p>
        )}

        {status === "active" && (
          <Link
            href={`/challenge/${id}`}
            className="flex-1 py-2 rounded-lg bg-brand-600 text-white text-xs font-bold text-center hover:bg-brand-700 transition-colors"
          >
            Play now →
          </Link>
        )}
      </div>
    </div>
  )
}
