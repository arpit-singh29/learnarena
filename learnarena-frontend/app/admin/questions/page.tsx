"use client"
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { adminQuestionsApi, courseApi, AdminQuestion, Course, BulkUploadResult } from "@/lib/api"

const DIFFICULTY_STYLE: Record<string, string> = {
  easy:   "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard:   "bg-red-100 text-red-700",
}

const CSV_TEMPLATE = `title,description,course_id,options,correct_option,difficulty,subject
What is the capital of France?,Choose the correct capital city,1,Paris|London|Berlin|Madrid,Paris,easy,Geography
What does CPU stand for?,Computer hardware basics,1,Central Processing Unit|Central Process Unit|Computer Personal Unit|Central Processor Utility,Central Processing Unit,medium,Computer Science`

export default function AdminQuestionsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [questions, setQuestions]     = useState<AdminQuestion[]>([])
  const [courses, setCourses]         = useState<Course[]>([])
  const [total, setTotal]             = useState(0)
  const [pageLoading, setPageLoading] = useState(true)
  const [search, setSearch]           = useState("")
  const [courseFilter, setCourseFilter] = useState<string>("")

  const [uploading, setUploading]     = useState(false)
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null)
  const [uploadErr, setUploadErr]     = useState("")

  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState<number | null>(null)
  const [form, setForm] = useState({
    title: "", description: "", course_id: "", options: ["", "", "", ""],
    correct_option: "", difficulty: "medium", subject: "",
  })
  const [formErr, setFormErr] = useState("")
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.push("/dashboard")
  }, [user, loading, router])

  const load = async () => {
    const [qRes, cRes] = await Promise.all([
      adminQuestionsApi.list({
        course_id: courseFilter ? Number(courseFilter) : undefined,
        search: search || undefined,
      }),
      courseApi.getAll(),
    ])
    setQuestions(qRes.data.items)
    setTotal(qRes.data.total)
    setCourses(cRes.data)
    setPageLoading(false)
  }

  useEffect(() => { if (user?.role === "admin") load() }, [user])

  const handleSearch = () => load()

  const resetForm = () => {
    setForm({ title: "", description: "", course_id: "", options: ["", "", "", ""], correct_option: "", difficulty: "medium", subject: "" })
    setEditingId(null)
    setFormErr("")
    setShowForm(false)
  }

  const startEdit = (q: AdminQuestion) => {
    setForm({
      title: q.title, description: q.description, course_id: String(q.course_id),
      options: [...q.options, "", "", "", ""].slice(0, Math.max(4, q.options.length)),
      correct_option: q.correct_option, difficulty: q.difficulty, subject: q.subject,
    })
    setEditingId(q.id)
    setShowForm(true)
  }

  const handleSubmitForm = async () => {
    setFormErr("")
    const cleanOptions = form.options.map(o => o.trim()).filter(Boolean)
    if (!form.title.trim()) return setFormErr("Title is required")
    if (!form.course_id) return setFormErr("Course is required")
    if (cleanOptions.length < 2) return setFormErr("At least 2 options are required")
    if (!cleanOptions.includes(form.correct_option)) return setFormErr("Correct option must match one of the options exactly")

    setSaving(true)
    try {
      const payload = {
        title: form.title, description: form.description || form.title,
        course_id: Number(form.course_id), options: cleanOptions,
        correct_option: form.correct_option, difficulty: form.difficulty,
        subject: form.subject || "General",
      }
      if (editingId) {
        await adminQuestionsApi.update(editingId, payload)
      } else {
        await adminQuestionsApi.create(payload)
      }
      resetForm()
      load()
    } catch (e: any) {
      setFormErr(e?.response?.data?.detail || "Failed to save question")
    }
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this question permanently?")) return
    await adminQuestionsApi.remove(id)
    load()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadErr("")
    setUploadResult(null)
    try {
      const res = await adminQuestionsApi.bulkUpload(file)
      setUploadResult(res.data)
      load()
    } catch (e: any) {
      setUploadErr(e?.response?.data?.detail || "Upload failed")
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url
    a.download = "question_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading || pageLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-900">📚 Question Bank ({total})</h1>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 transition-colors">
          + Add Question
        </button>
      </div>

      {/* Bulk upload */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-slate-800">📤 Bulk Upload (CSV)</p>
          <button onClick={downloadTemplate} className="text-xs text-brand-600 font-semibold hover:underline">
            Download template
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Columns: title, description, course_id, options (pipe-separated: A|B|C|D), correct_option, difficulty (easy/medium/hard), subject
        </p>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading}
          className="text-sm text-slate-600 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:font-semibold hover:file:bg-brand-100 file:cursor-pointer cursor-pointer disabled:opacity-50" />

        {uploading && <p className="text-sm text-slate-400 mt-3">Uploading and validating…</p>}

        {uploadErr && (
          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{uploadErr}</div>
        )}

        {uploadResult && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex gap-4 mb-2">
              <span className="text-sm font-bold text-emerald-700">✅ Imported: {uploadResult.imported}</span>
              <span className="text-sm font-bold text-red-600">❌ Skipped: {uploadResult.skipped}</span>
              <span className="text-sm text-slate-400">of {uploadResult.total_rows} rows</span>
            </div>
            {uploadResult.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto mt-2 space-y-1">
                {uploadResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-500">
                    Row {err.row_number}: {err.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-200 shadow-sm p-6 mb-6">
          <p className="font-bold text-slate-800 mb-4">{editingId ? "Edit question" : "New question"}</p>
          {formErr && <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{formErr}</div>}

          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Question title"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />

            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional, defaults to title)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" rows={2} />

            <div className="grid sm:grid-cols-3 gap-3">
              <select value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="">Select course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Subject"
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Options</p>
              {form.options.map((opt, i) => (
                <input key={i} value={opt}
                  onChange={e => setForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? e.target.value : o) }))}
                  placeholder={`Option ${i + 1}`}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 mb-2" />
              ))}
            </div>

            <input value={form.correct_option} onChange={e => setForm(f => ({ ...f, correct_option: e.target.value }))}
              placeholder="Correct option (must match one option exactly)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />

            <div className="flex gap-2">
              <button onClick={handleSubmitForm} disabled={saving}
                className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update question" : "Create question"}
              </button>
              <button onClick={resetForm}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Search by title…"
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
        <select value={courseFilter} onChange={e => { setCourseFilter(e.target.value); load() }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="">All courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <button onClick={handleSearch}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors">
          Search
        </button>
      </div>

      {/* Questions list */}
      <div className="space-y-2">
        {questions.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">📚</p>
            <p className="font-medium">No questions found</p>
          </div>
        ) : questions.map(q => (
          <div key={q.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${DIFFICULTY_STYLE[q.difficulty]}`}>
                  {q.difficulty}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{q.course_title}</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">{q.subject}</span>
              </div>
              <p className="font-semibold text-slate-800 text-sm">{q.title}</p>
              <p className="text-xs text-slate-400 mt-1">
                Options: {q.options.join(", ")} · Correct: <span className="text-emerald-600 font-semibold">{q.correct_option}</span>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => startEdit(q)}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                Edit
              </button>
              <button onClick={() => handleDelete(q.id)}
                className="px-3 py-1.5 border border-red-200 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
