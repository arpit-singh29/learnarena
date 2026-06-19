"use client"
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { challengeApi, Question, ChallengeResult } from "@/lib/api"

type AnswerValue = string | null

export default function ChallengePage() {
  const { user, loading } = useAuth()
  const router  = useRouter()
  const params  = useParams()
  const challengeId = Number(params.id)

  const [questions, setQuestions]       = useState<Question[]>([])
  const [pageLoading, setPageLoading]   = useState(true)
  const [startError, setStartError]     = useState("")
  const [currentIdx, setCurrentIdx]     = useState(0)
  const [selected, setSelected]         = useState<string | null>(null)
  const [answers, setAnswers]           = useState<AnswerValue[]>([])
  const [totalElapsed, setTotalElapsed] = useState(0)
  const globalStartRef  = useRef<number>(0)
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const [result, setResult]             = useState<ChallengeResult | null>(null)
  const [submitting, setSubmitting]     = useState(false)
  const submitLock                      = useRef(false)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    challengeApi.questions(challengeId)
      .then(res => {
        setQuestions(res.data)
        setAnswers(new Array(res.data.length).fill(null))
        globalStartRef.current = Date.now()
        timerRef.current = setInterval(() => {
          setTotalElapsed(Math.floor((Date.now() - globalStartRef.current) / 1000))
        }, 1000)
      })
      .catch(() => setStartError("Could not load challenge. It may not be active yet."))
      .finally(() => setPageLoading(false))
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [user, challengeId])

  const currentQ = questions[currentIdx]
  const total    = questions.length
  const isLast   = currentIdx === total - 1

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0")
    const sec = (s % 60).toString().padStart(2, "0")
    return `${m}:${sec}`
  }

  const navigate = (toIdx: number, saveValue: AnswerValue) => {
    setAnswers(prev => {
      const copy = [...prev]
      copy[currentIdx] = saveValue
      const dest = copy[toIdx]
      setTimeout(() => setSelected(dest && dest !== "" ? dest : null), 0)
      return copy
    })
    setCurrentIdx(toIdx)
  }

  const handleNext = () => navigate(currentIdx + 1, selected ?? "")

  const paletteColor = (i: number) => {
    if (i === currentIdx) return "bg-indigo-600 text-white shadow-lg scale-110"
    const a = answers[i]
    if (a === null) return "bg-slate-200 text-slate-600 hover:bg-slate-300"
    if (a === "")   return "bg-amber-400 text-amber-900 hover:bg-amber-500"
    return "bg-emerald-500 text-white hover:bg-emerald-600"
  }

  const handleSubmit = async () => {
    if (submitLock.current) return
    submitLock.current = true
    if (timerRef.current) clearInterval(timerRef.current)

    const finalAnswers = [...answers]
    finalAnswers[currentIdx] = selected ?? (finalAnswers[currentIdx] === null ? "" : finalAnswers[currentIdx])

    setSubmitting(true)
    try {
      const payload = questions.map((q, i) => ({
        question_id: q.id,
        answer: finalAnswers[i] ?? "",
      }))
      const res = await challengeApi.submit(challengeId, payload, totalElapsed)
      setResult(res.data)
    } catch (err: any) {
      submitLock.current = false
      globalStartRef.current = Date.now() - totalElapsed * 1000
      timerRef.current = setInterval(() => {
        setTotalElapsed(Math.floor((Date.now() - globalStartRef.current) / 1000))
      }, 1000)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || pageLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin"/>
      <p className="text-sm text-slate-400">Loading challenge…</p>
    </div>
  )

  if (startError) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">⚔️</p>
        <p className="font-bold text-slate-700 mb-2">{startError}</p>
        <button onClick={() => router.push("/challenges")}
          className="mt-4 px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm">
          Back to challenges
        </button>
      </div>
    </div>
  )

  // Results
  if (result) {
    const won  = result.winner_id === user?.id
    const draw = result.winner_id === null && result.status === "completed"
    const pending = result.status !== "completed"
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center mb-4">
            <p className="text-6xl mb-3">{pending ? "⏳" : won ? "🏆" : draw ? "🤝" : "😤"}</p>
            <h1 className="text-2xl font-black text-slate-900">
              {pending ? "Answers submitted!" : won ? "You won!" : draw ? "It's a draw!" : "You lost!"}
            </h1>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              {pending ? "Waiting for opponent to finish…" : "Challenge complete"}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Your score",    value: result.your_score,               color: "text-indigo-600" },
                { label: "Opponent",      value: result.opponent_score ?? "—",    color: "text-slate-600" },
                { label: "Your accuracy", value: `${result.your_accuracy.toFixed(1)}%`, color: "text-emerald-600" },
                { label: "Your time",     value: formatTime(Math.round(result.your_time)), color: "text-slate-700" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className={`text-xl font-black ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {result.elo_change !== 0 && (
              <div className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold mb-4 ${
                result.elo_change > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
              }`}>
                ELO {result.elo_change > 0 ? `+${result.elo_change}` : result.elo_change}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={() => router.push("/challenges")}
              className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors">
              Back to challenges
            </button>
            <button onClick={() => router.push("/badges")}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
              🏅 Check badges
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentQ) return null
  const progress = ((currentIdx + 1) / total) * 100
  const answered = answers.filter(a => a !== null && a !== "").length
  const skipped  = answers.filter(a => a === "").length

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 flex flex-col">
      {/* Challenge header */}
      <div className="sticky top-14 z-40 bg-indigo-600 text-white px-4 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">⚔️ Challenge Mode</span>
          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }}/>
          </div>
          <span className="font-mono font-bold text-sm">⏱ {formatTime(totalElapsed)}</span>
          <span className="text-sm opacity-80">{currentIdx + 1}/{total}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row max-w-3xl mx-auto w-full px-4 py-6 gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
            <div className="flex items-center flex-wrap gap-2 mb-5">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                currentQ.difficulty === "easy" ? "bg-green-100 text-green-700"
                : currentQ.difficulty === "hard" ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
              }`}>{currentQ.difficulty}</span>
              {currentQ.subject && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-600 font-medium">
                  {currentQ.subject}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">{currentQ.title}</h2>
            {currentQ.description && currentQ.description !== currentQ.title && (
              <p className="text-sm text-slate-500 mb-4">{currentQ.description}</p>
            )}

            <div className="space-y-3 mt-4">
              {currentQ.options.map((opt, i) => {
                const letters = ["A","B","C","D","E"]
                const isSel = selected === opt
                return (
                  <button key={opt} onClick={() => setSelected(isSel ? null : opt)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-3 group ${
                      isSel ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700"
                    }`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      isSel ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                    }`}>{letters[i]}</span>
                    <span className="flex-1">{opt}</span>
                    {isSel && <span className="text-indigo-500">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3">
            {!isLast && (
              <button onClick={() => navigate(currentIdx + 1, "")}
                className="px-6 py-3.5 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-700 font-semibold text-sm hover:bg-amber-100 transition-all">
                Skip
              </button>
            )}
            {isLast ? (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Submitting…</>
                  : "Submit challenge ✓"}
              </button>
            ) : (
              <button onClick={handleNext}
                className="flex-1 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors">
                {selected ? "Next →" : "Next (unattempted) →"}
              </button>
            )}
          </div>
        </div>

        {/* Palette */}
        <div className="lg:w-52 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sticky top-36">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Questions</p>
            <div className="grid grid-cols-5 lg:grid-cols-4 gap-1.5 mb-4">
              {questions.map((_, i) => (
                <button key={i} onClick={() => navigate(i, selected ?? (answers[currentIdx] === null ? "" : answers[currentIdx]))}
                  className={`aspect-square rounded-lg text-xs font-bold transition-all ${paletteColor(i)}`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="space-y-1.5 border-t border-slate-100 pt-3 mb-4">
              {[
                { cls: "bg-indigo-600",  label: "Current" },
                { cls: "bg-emerald-500", label: "Answered" },
                { cls: "bg-amber-400",   label: "Skipped" },
                { cls: "bg-slate-200",   label: "Not visited" },
              ].map(({ cls, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded shrink-0 ${cls}`}/>
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                <p className="text-lg font-black text-emerald-700">{answered}</p>
                <p className="text-xs text-emerald-500">answered</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                <p className="text-lg font-black text-amber-600">{skipped}</p>
                <p className="text-xs text-amber-500">skipped</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
