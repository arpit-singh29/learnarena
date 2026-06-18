"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { quizApi, Question, QuizSubmitResponse } from "@/lib/api"

// null  = not visited yet
// ""    = visited but skipped (no option chosen)
// "xyz" = answered with value "xyz"
type AnswerValue = string | null

export default function QuizPage() {
  const { user, loading } = useAuth()
  const router  = useRouter()
  const params  = useParams()
  const courseId = Number(params.courseId)

  const [sessionId, setSessionId]     = useState<number | null>(null)
  const [questions, setQuestions]     = useState<Question[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [startError, setStartError]   = useState("")

  const [currentIdx, setCurrentIdx]   = useState(0)
  const [selected, setSelected]       = useState<string | null>(null)
  // answers[i]: null=not visited, ""=skipped, "value"=answered
  const [answers, setAnswers]         = useState<AnswerValue[]>([])

  // ONE global timer
  const [totalElapsed, setTotalElapsed] = useState(0)
  const globalStartRef  = useRef<number>(0)
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)

  const [result, setResult]           = useState<QuizSubmitResponse | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState("")
  const submitLock                    = useRef(false)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    quizApi.start(courseId)
      .then((res) => {
        setSessionId(res.data.quiz_session_id)
        setQuestions(res.data.questions)
        setAnswers(new Array(res.data.questions.length).fill(null))
        globalStartRef.current = Date.now()
        timerRef.current = setInterval(() => {
          setTotalElapsed(Math.floor((Date.now() - globalStartRef.current) / 1000))
        }, 1000)
      })
      .catch(() => setStartError("Could not load quiz. Please go back and try again."))
      .finally(() => setPageLoading(false))
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [user, courseId])

  const currentQ = questions[currentIdx]
  const total    = questions.length
  const isLast   = currentIdx === total - 1

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0")
    const sec = (s % 60).toString().padStart(2, "0")
    return `${m}:${sec}`
  }

  // Save answer for currentIdx and navigate — uses functional update
  // so we never read stale answers from closure
  const navigate = (toIdx: number, saveValue: AnswerValue) => {
    setAnswers((prev) => {
      const copy = [...prev]
      copy[currentIdx] = saveValue
      // pre-fill selected for the destination inside the same update cycle
      const dest = copy[toIdx]
      // schedule selected update AFTER state is committed
      setTimeout(() => {
        setSelected(dest !== null && dest !== "" ? dest : null)
      }, 0)
      return copy
    })
    setCurrentIdx(toIdx)
  }

  const handleNext = () => {
    // selected = chosen option, null = user clicked Next without choosing = skipped
    navigate(currentIdx + 1, selected ?? "")
  }

  const jumpTo = (idx: number) => {
    // save current question as skipped if nothing selected, else save selection
    setAnswers((prev) => {
      const copy = [...prev]
      copy[currentIdx] = selected ?? (prev[currentIdx] === null ? "" : prev[currentIdx])
      // restore selection for destination
      const dest = copy[idx]
      setTimeout(() => {
        setSelected(dest !== null && dest !== "" ? dest : null)
      }, 0)
      return copy
    })
    setCurrentIdx(idx)
  }

  const handleSubmit = async () => {
    if (!sessionId || submitLock.current) return
    submitLock.current = true

    if (timerRef.current) clearInterval(timerRef.current)

    // Save current answer
    const finalAnswers = [...answers]
    finalAnswers[currentIdx] = selected ?? (finalAnswers[currentIdx] === null ? "" : finalAnswers[currentIdx])

    setSubmitting(true)
    setSubmitError("")

    const perQ = total > 0 ? totalElapsed / total : 0
    const payload = questions.map((q, i) => ({
      question_id:        q.id,
      answer:             finalAnswers[i] ?? "",
      time_taken_seconds: perQ,
    }))

    try {
      const res = await quizApi.submit(sessionId, payload)
      setResult(res.data)
    } catch (err: any) {
      submitLock.current = false
      setSubmitError(err?.response?.data?.detail || "Submit failed. Please try again.")
      // restart timer
      globalStartRef.current = Date.now() - totalElapsed * 1000
      timerRef.current = setInterval(() => {
        setTotalElapsed(Math.floor((Date.now() - globalStartRef.current) / 1000))
      }, 1000)
    } finally {
      setSubmitting(false)
    }
  }

  // Palette colour for each question box — dark and clearly distinct
  const paletteColor = (i: number) => {
    if (i === currentIdx) return "bg-indigo-600 text-white shadow-lg scale-110 ring-2 ring-indigo-300"
    const a = answers[i]
    if (a === null)       return "bg-slate-200 text-slate-600 hover:bg-slate-300"              // not visited — grey
    if (a === "")         return "bg-amber-400 text-amber-900 hover:bg-amber-500"              // skipped — solid amber
    return                       "bg-emerald-500 text-white hover:bg-emerald-600"              // answered — solid green
  }

  const answered = answers.filter((a) => a !== null && a !== "").length
  const skipped  = answers.filter((a) => a === "").length

  // ── loading ─────────────────────────────────────────────────
  if (loading || pageLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin"/>
        <p className="text-sm text-slate-400 font-medium">Preparing your quiz…</p>
      </div>
    )
  }

  if (startError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">😕</p>
          <p className="font-bold text-slate-700 mb-2">Something went wrong</p>
          <p className="text-sm text-slate-400 mb-6">{startError}</p>
          <button onClick={() => router.push("/dashboard")}
            className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── results ─────────────────────────────────────────────────
  if (result) {
    const pct   = result.accuracy_pct
    const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪"
    const msg   = pct >= 80 ? "Excellent work!" : pct >= 50 ? "Good effort!" : "Keep practising!"
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center mb-4">
            <p className="text-6xl mb-3">{emoji}</p>
            <h1 className="text-2xl font-black text-slate-900">{msg}</h1>
            <p className="text-slate-400 text-sm mt-1 mb-6">Quiz submitted successfully</p>

            <div className="flex justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10"/>
                  <circle cx="50" cy="50" r="40" fill="none"
                    stroke={pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f43f5e"}
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * 251.2} 251.2`}/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900">{pct.toFixed(0)}%</span>
                  <span className="text-xs text-slate-400">accuracy</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "Score",     value: result.total_score,                         color: "text-indigo-600" },
                { label: "Time",      value: formatTime(Math.round(result.total_time_secs)), color: "text-slate-700" },
                { label: "Correct ✓", value: result.correct,                             color: "text-emerald-600" },
                { label: "Wrong ✗",  value: result.wrong,                               color: "text-red-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">Avg {result.avg_time_secs.toFixed(1)}s per question</p>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={() => router.push("/analytics")}
              className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors">
              📊 See my analytics
            </button>
            <button onClick={() => router.push("/dna")}
              className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition-colors">
              🧬 View DNA report
            </button>
            <button onClick={() => router.push("/dashboard")}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentQ) return null
  const progress = ((currentIdx + 1) / total) * 100

  // ── quiz screen ──────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 flex flex-col">

      {/* sticky top bar */}
      <div className="sticky top-14 z-40 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold shrink-0 ${
            totalElapsed >= 1800 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-700"
          }`}>
            ⏱ {formatTime(totalElapsed)}
          </div>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}/>
          </div>
          <span className="text-sm font-semibold text-slate-500 shrink-0">
            {currentIdx + 1} / {total}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row max-w-3xl mx-auto w-full px-4 py-6 gap-6">

        {/* question area */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">

            <div className="flex items-center flex-wrap gap-2 mb-5">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                currentQ.difficulty === "easy"   ? "bg-green-100 text-green-700"
                : currentQ.difficulty === "hard" ? "bg-red-100 text-red-700"
                :                                  "bg-amber-100 text-amber-700"
              }`}>{currentQ.difficulty}</span>
              {currentQ.subject && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-600 font-medium">
                  {currentQ.subject}
                </span>
              )}
              <span className="ml-auto text-xs text-slate-400 font-medium">
                Question {currentIdx + 1} of {total}
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 leading-snug mb-2">
              {currentQ.title}
            </h2>
            {currentQ.description && currentQ.description !== currentQ.title && (
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                {currentQ.description}
              </p>
            )}

            <div className="space-y-3 mt-5">
              {currentQ.options.map((opt, i) => {
                const letters    = ["A", "B", "C", "D", "E"]
                const isSelected = selected === opt
                return (
                  <button key={opt} onClick={() => setSelected(isSelected ? null : opt)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-3 group ${
                      isSelected
                        ? "border-brand-500 bg-brand-50 text-brand-900"
                        : "border-slate-200 hover:border-brand-300 hover:bg-slate-50 text-slate-700"
                    }`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                      isSelected ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-600"
                    }`}>{letters[i] ?? i + 1}</span>
                    <span className="flex-1">{opt}</span>
                    {isSelected && <span className="text-brand-500 shrink-0">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* action buttons */}
          <div className="flex gap-3">

            {/* Skip — always visible, always clickable, saves "" for current question */}
            {!isLast && (
              <button
                onClick={() => navigate(currentIdx + 1, "")}
                className="px-6 py-3.5 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-700 font-semibold text-sm hover:bg-amber-100 hover:border-amber-400 transition-all"
              >
                Skip
              </button>
            )}

            {/* Next — ALWAYS clickable, no disabled, saves selected or "" */}
            {!isLast && (
              <button
                onClick={handleNext}
                className="flex-1 py-3.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-sm"
              >
                {selected ? "Next →" : "Next (unattempted) →"}
              </button>
            )}

            {/* Submit — shown only on last question */}
            {isLast && (
              <>
                <button
                  onClick={() => { setSelected(null); navigate(currentIdx, ""); setTimeout(handleSubmit, 50) }}
                  disabled={submitting}
                  className="px-6 py-3.5 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-700 font-semibold text-sm hover:bg-amber-100 transition-all disabled:opacity-40"
                >
                  Skip & submit
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Submitting…</>
                    : "Submit quiz ✓"
                  }
                </button>
              </>
            )}
          </div>

          {submitError && (
            <div className="mt-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {submitError}
            </div>
          )}
        </div>

        {/* palette panel */}
        <div className="lg:w-52 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sticky top-36">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Questions</p>

            <div className="grid grid-cols-5 lg:grid-cols-4 gap-1.5 mb-4">
              {questions.map((_, i) => (
                <button key={i} onClick={() => jumpTo(i)}
                  className={`aspect-square rounded-lg text-xs font-bold transition-all ${paletteColor(i)}`}>
                  {i + 1}
                </button>
              ))}
            </div>

            {/* legend */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3 mb-4">
              {[
                { cls: "bg-indigo-600",   label: "Current" },
                { cls: "bg-emerald-500",  label: "Answered ✓" },
                { cls: "bg-amber-400",    label: "Skipped" },
                { cls: "bg-slate-200",    label: "Not visited" },
              ].map(({ cls, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded shrink-0 ${cls}`}/>
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* counts */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                <p className="text-lg font-black text-emerald-700">{answered}</p>
                <p className="text-xs text-emerald-500">answered</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-2.5 text-center">
                <p className="text-lg font-black text-yellow-600">{skipped}</p>
                <p className="text-xs text-yellow-500">skipped</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
