"use client"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { challengeApi, courseApi, ChallengeItem, EloRating, Course } from "@/lib/api"

const MODE_INFO: Record<string, { label: string; desc: string; icon: string }> = {
  accuracy: { label: "Accuracy Battle", desc: "Most correct answers wins", icon: "🎯" },
  speed:    { label: "Speed Battle",    desc: "Fastest correct answers wins", icon: "⚡" },
  mixed:    { label: "Mixed Mode",      desc: "Score = accuracy + speed combined", icon: "🔥" },
}

const ELO_RANK_STYLE: Record<string, string> = {
  Bronze:   "bg-amber-100 text-amber-800",
  Silver:   "bg-slate-100 text-slate-700",
  Gold:     "bg-yellow-100 text-yellow-800",
  Platinum: "bg-cyan-100 text-cyan-800",
  Diamond:  "bg-purple-100 text-purple-800",
}

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  active:    "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  declined:  "bg-red-100 text-red-600",
}

export default function ChallengesPage() {
  const { user, loading } = useAuth()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const preOpponentId   = searchParams.get("opponent")
  const preOpponentName = searchParams.get("name")

  const [challenges, setChallenges] = useState<ChallengeItem[]>([])
  const [elo, setElo]               = useState<EloRating | null>(null)
  const [courses, setCourses]       = useState<Course[]>([])
  const [pageLoading, setPageLoading] = useState(true)

  const [form, setForm] = useState({
    opponent_id:    preOpponentId || "",
    opponent_name:  preOpponentName || "",
    course_id:      "",
    mode:           "mixed",
    question_count: "5",
  })
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState("")

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  const load = async () => {
    if (!user) return
    const [ch, el, co] = await Promise.all([
      challengeApi.my(),
      challengeApi.myElo(),
      courseApi.getAll(),
    ])
    setChallenges(ch.data)
    setElo(el.data)
    setCourses(co.data)
    setPageLoading(false)
  }

  useEffect(() => { load() }, [user])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.opponent_id || !form.course_id) {
      setCreateMsg("Please fill in opponent ID and course.")
      return
    }
    setCreating(true)
    setCreateMsg("")
    try {
      await challengeApi.create({
        opponent_id:    Number(form.opponent_id),
        course_id:      Number(form.course_id),
        mode:           form.mode,
        question_count: Number(form.question_count),
      })
      setCreateMsg("Challenge sent! Waiting for opponent to accept.")
      load()
      setForm(f => ({ ...f, opponent_id: "", opponent_name: "", course_id: "" }))
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => d.msg ?? JSON.stringify(d)).join(", ")
        : typeof detail === "string"
        ? detail
        : "Failed to create challenge."
      setCreateMsg(msg)
    }
    setCreating(false)
  }

  const handleAccept = async (id: number) => {
    await challengeApi.accept(id)
    router.push(`/challenge/${id}`)
  }

  const handleDecline = async (id: number) => {
    await challengeApi.decline(id)
    load()
  }

  if (loading || pageLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin"/>
    </div>
  )

  const pending   = challenges.filter(c => c.status === "pending")
  const active    = challenges.filter(c => c.status === "active")
  const completed = challenges.filter(c => c.status === "completed")

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-900">⚔️ Challenge Arena</h1>

        {/* ELO badge */}
        {elo && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${ELO_RANK_STYLE[elo.rank] ?? "bg-slate-100 text-slate-700"}`}>
            <span>{elo.rank}</span>
            <span className="font-black text-lg">{elo.rating}</span>
            <span className="text-xs font-normal opacity-70">{elo.wins}W {elo.losses}L {elo.draws}D</span>
          </div>
        )}
      </div>

      {/* Create challenge */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <p className="font-bold text-slate-800 mb-4">🆕 New challenge</p>

        {createMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${createMsg.includes("sent") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
            {createMsg}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">
                Opponent User ID {form.opponent_name && <span className="text-brand-600">({form.opponent_name})</span>}
              </label>
              <input
                value={form.opponent_id}
                onChange={e => setForm(f => ({ ...f, opponent_id: e.target.value, opponent_name: "" }))}
                placeholder="Enter opponent's user ID"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <p className="text-xs text-slate-400 mt-1">Tip: Go to Friends → click Challenge to auto-fill</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Course</label>
              <select value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="">Select a course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>

          {/* Mode selector */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-2 block">Battle mode</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(MODE_INFO).map(([key, info]) => (
                <button key={key} type="button"
                  onClick={() => setForm(f => ({ ...f, mode: key }))}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    form.mode === key
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}>
                  <p className="text-xl mb-1">{info.icon}</p>
                  <p className={`text-xs font-bold ${form.mode === key ? "text-brand-700" : "text-slate-700"}`}>{info.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{info.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Questions</label>
              <select value={form.question_count} onChange={e => setForm(f => ({ ...f, question_count: e.target.value }))}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
            <button type="submit" disabled={creating}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 transition-colors disabled:opacity-60 mt-5">
              {creating ? "Sending…" : "Send challenge ⚔️"}
            </button>
          </div>
        </form>
      </div>

      {/* Pending — need action */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-slate-700 mb-3">📬 Pending ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map(c => {
              const isChallenger = c.challenger_id === user?.id
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-amber-200 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      {isChallenger
                        ? <>You challenged <span className="text-brand-600">{c.opponent_username}</span></>
                        : <><span className="text-brand-600">{c.challenger_username}</span> challenged you</>
                      }
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {MODE_INFO[c.mode]?.icon} {MODE_INFO[c.mode]?.label} · {c.question_count} questions
                    </p>
                  </div>
                  {!isChallenger ? (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleAccept(c.id)}
                        className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                        Accept
                      </button>
                      <button onClick={() => handleDecline(c.id)}
                        className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 font-semibold shrink-0">Waiting…</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Active — go play */}
      {active.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-slate-700 mb-3">🟢 Active — your turn ({active.length})</h2>
          <div className="space-y-3">
            {active.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-blue-200 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">
                    vs <span className="text-brand-600">
                      {c.challenger_id === user?.id ? c.opponent_username : c.challenger_username}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {MODE_INFO[c.mode]?.icon} {MODE_INFO[c.mode]?.label} · {c.question_count} questions
                  </p>
                </div>
                <Link href={`/challenge/${c.id}`}
                  className="px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-700 transition-colors shrink-0">
                  Play now →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-700 mb-3">✅ Completed ({completed.length})</h2>
          <div className="space-y-3">
            {completed.map(c => {
              const iWon = c.winner_id === user?.id
              const isDraw = c.winner_id === null
              const myScore = c.challenger_id === user?.id ? c.challenger_score : c.opponent_score
              const theirScore = c.challenger_id === user?.id ? c.opponent_score : c.challenger_score
              const opponent = c.challenger_id === user?.id ? c.opponent_username : c.challenger_username
              return (
                <div key={c.id} className={`bg-white rounded-2xl border p-4 flex items-center justify-between gap-4 ${
                  iWon ? "border-emerald-200" : isDraw ? "border-slate-200" : "border-red-200"
                }`}>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      vs <span className="text-brand-600">{opponent}</span>
                      <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                        iWon ? "bg-emerald-100 text-emerald-700"
                        : isDraw ? "bg-slate-100 text-slate-600"
                        : "bg-red-100 text-red-600"
                      }`}>
                        {iWon ? "Won 🏆" : isDraw ? "Draw" : "Lost"}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {MODE_INFO[c.mode]?.icon} Score: <strong>{myScore}</strong> vs <strong>{theirScore}</strong>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {challenges.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">⚔️</p>
          <p className="font-medium">No challenges yet.</p>
          <p className="text-sm mt-1">Go to Friends and challenge someone!</p>
        </div>
      )}
    </div>
  )
}
