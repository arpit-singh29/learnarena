"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { quizApi, Question, QuizSubmitResponse } from "@/lib/api"

type AnswerMap = Record<number, { answer: string; time: number }>

export default function QuizPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const courseId = Number(params.courseId)

  const [sessionId, setSessionId] = useState<number | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [questionStart, setQuestionStart] = useState<number>(Date.now())
  const [result, setResult] = useState<QuizSubmitResponse | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  // Start quiz
  useEffect(() => {
    if (!user) return
    quizApi.start(courseId)
      .then((res) => {
        setSessionId(res.data.quiz_session_id)
        setQuestions(res.data.questions)
        setQuestionStart(Date.now())
      })
      .catch(() => router.push("/dashboard"))
      .finally(() => setPageLoading(false))
  }, [user, courseId, router])

  // Timer per question
  useEffect(() => {
    if (result) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - questionStart) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [questionStart, result])

  const currentQ = questions[current]

  const confirmAnswer = useCallback(() => {
    if (!selected || !currentQ) return
    const timeTaken = (Date.now() - questionStart) / 1000
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: { answer: selected, time: timeTaken },
    }))

    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1)
      setSelected(null)
      setQuestionStart(Date.now())
      setElapsed(0)
    }
  }, [selected, currentQ, current, questions.length, questionStart])

  const handleSubmit = async () => {
    if (!sessionId) return
    // save current answer if any
    let finalAnswers = { ...answers }
    if (selected && currentQ) {
      finalAnswers[currentQ.id] = {
        answer: selected,
        time: (Date.now() - questionStart) / 1000,
      }
    }

    setSubmitting(true)
    try {
      const payload = Object.entries(finalAnswers).map(([qId, val]) => ({
        question_id: Number(qId),
        answer: val.answer,
        time_taken_seconds: val.time,
      }))
      const res = await quizApi.submit(sessionId, payload)
      setResult(res.data)
    } catch {}
    setSubmitting(false)
  }

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
      </div>
    )
  }

  // Results screen
  if (result) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <p className="text-5xl mb-4">{result.accuracy_pct >= 80 ? "🎉" : result.accuracy_pct >= 50 ? "👍" : "💪"}</p>
          <h1 className="text-2xl font-black text-slate-900 mb-1">Quiz complete!</h1>
          <p className="text-slate-500 text-sm mb-6">Your results</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: "Score", value: result.total_score, color: "text-indigo-600" },
              { label: "Accuracy", value: `${result.accuracy_pct.toFixed(1)}%`, color: "text-emerald-600" },
              { label: "Correct", value: result.correct, color: "text-green-600" },
              { label: "Wrong", value: result.wrong, color: "text-red-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400">{label}</p>
                <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 mb-6">
            Avg time: {result.avg_time_secs.toFixed(1)}s per question
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push("/analytics")}
              className="w-full py-2.5 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors"
            >
              See analytics
            </button>
            <button
              onClick={() => router.push("/dna")}
              className="w-full py-2.5 rounded-lg bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition-colors"
            >
              View DNA report
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentQ) return null

  const progress = ((current) / questions.length) * 100
  const isLast = current === questions.length - 1

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-slate-500 shrink-0">
            {current + 1} / {questions.length}
          </span>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
          {/* Meta */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              currentQ.difficulty === "easy" ? "bg-green-100 text-green-700"
              : currentQ.difficulty === "hard" ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
            }`}>
              {currentQ.difficulty}
            </span>
            {currentQ.subject && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                {currentQ.subject}
              </span>
            )}
            <span className="ml-auto text-sm font-mono text-slate-400">
              ⏱ {elapsed}s
            </span>
          </div>

          <h2 className="font-bold text-slate-900 mb-1">{currentQ.title}</h2>
          {currentQ.description && (
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">{currentQ.description}</p>
          )}

          {/* Options */}
          <div className="space-y-2.5">
            {currentQ.options.map((opt) => (
              <button
                key={opt}
                onClick={() => setSelected(opt)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  selected === opt
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {!isLast ? (
            <button
              onClick={confirmAnswer}
              disabled={!selected}
              className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next question →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !selected}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting…" : "Submit quiz ✓"}
            </button>
          )}
        </div>

        {/* Answered count */}
        <p className="text-center text-xs text-slate-400 mt-3">
          {Object.keys(answers).length} of {questions.length} answered
        </p>
      </div>
    </div>
  )
}
