"use client"
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { profileApi, ProfileData } from "@/lib/api"

const ELO_RANK_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Bronze:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"  },
  Silver:   { bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-300"  },
  Gold:     { bg: "bg-yellow-50",  text: "text-yellow-700",  border: "border-yellow-200" },
  Platinum: { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200"   },
  Diamond:  { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200" },
}

const ELO_RANK_EMOJI: Record<string, string> = {
  Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎", Diamond: "👑",
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 text-center">
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs font-semibold text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="text-sm font-bold text-slate-800">{score.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const params   = useParams()
  const router   = useRouter()
  const username = params.username as string

  const [profile, setProfile]         = useState<ProfileData | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [notFound, setNotFound]       = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (!user || !username) return
    profileApi.get(username)
      .then(res => setProfile(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setPageLoading(false))
  }, [user, username])

  if (loading || pageLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">👤</p>
        <h2 className="font-bold text-slate-700 mb-2">User not found</h2>
        <p className="text-sm text-slate-400 mb-6">No user with that username exists.</p>
        <button onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm">
          Go back
        </button>
      </div>
    </div>
  )

  if (!profile) return null

  const rankStyle = ELO_RANK_STYLE[profile.elo_rank] ?? ELO_RANK_STYLE.Bronze
  const rankEmoji = ELO_RANK_EMOJI[profile.elo_rank] ?? "🥉"
  const isSelf    = profile.friend_status === "self"
  const subjects  = Object.entries(profile.subject_breakdown)
  const accuracy  = profile.total_attempted > 0
    ? ((profile.total_correct / profile.total_attempted) * 100).toFixed(1)
    : "0.0"

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 mb-5 text-center">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl font-black text-brand-600">
            {profile.username[0].toUpperCase()}
          </span>
        </div>

        <h1 className="text-2xl font-black text-slate-900">{profile.username}</h1>
        <p className="text-sm text-slate-400 mt-1">Joined {profile.joined}</p>

        {/* ELO Rank badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border font-bold text-sm mt-3 ${rankStyle.bg} ${rankStyle.text} ${rankStyle.border}`}>
          {rankEmoji} {profile.elo_rank} · {profile.elo_rating} ELO
        </div>

        {/* Action buttons */}
        {!isSelf && (
          <div className="flex gap-3 justify-center mt-5">
            <button
              onClick={() => router.push(`/challenges?opponent=${profile.id}&name=${profile.username}`)}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
              ⚔️ Challenge
            </button>
            {profile.friend_status === "not_friends" && (
              <button
                onClick={() => router.push("/friends")}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                👥 Add Friend
              </button>
            )}
            {profile.friend_status === "friends" && (
              <span className="px-5 py-2.5 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl border border-emerald-200">
                ✓ Friends
              </span>
            )}
          </div>
        )}

        {isSelf && (
          <div className="mt-5">
            <Link href="/dna"
              className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors inline-block">
              🧬 View DNA Report
            </Link>
          </div>
        )}
      </div>

      {/* Challenge record */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
        <h2 className="font-bold text-slate-800 mb-4">⚔️ Challenge Record</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Wins"   value={profile.wins}   sub="🏆" />
          <StatCard label="Losses" value={profile.losses} sub="😤" />
          <StatCard label="Draws"  value={profile.draws}  sub="🤝" />
        </div>
      </div>

      {/* Quiz stats */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
        <h2 className="font-bold text-slate-800 mb-4">📊 Quiz Stats</h2>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatCard label="Questions solved" value={profile.total_attempted} />
          <StatCard label="Accuracy"         value={`${accuracy}%`} />
          <StatCard label="Day streak"       value={profile.streak_days} sub="🔥" />
          <StatCard label="Hard questions"   value={profile.hard_correct} sub="solved" />
        </div>

        {profile.total_attempted > 0 && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <ScoreBar label="Accuracy"  score={profile.accuracy_score}  color="bg-indigo-500" />
            <ScoreBar label="Speed"     score={profile.speed_score}     color="bg-emerald-500" />
            <ScoreBar label="Knowledge" score={profile.knowledge_score} color="bg-amber-500" />
          </div>
        )}
      </div>

      {/* Subject breakdown */}
      {subjects.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
          <h2 className="font-bold text-slate-800 mb-4">📚 Subject Performance</h2>
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
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${acc}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Badges */}
      {profile.badges.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">🏅 Badges ({profile.badges.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {profile.badges.map(b => (
              <div key={b.name}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <p className="text-sm font-bold text-slate-800">{b.name}</p>
                  <p className="text-xs text-slate-400">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.badges.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center text-slate-400">
          <p className="text-3xl mb-2">🏅</p>
          <p className="text-sm">No badges earned yet</p>
        </div>
      )}
    </div>
  )
}
