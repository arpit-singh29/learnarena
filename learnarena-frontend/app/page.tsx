"use client"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.push("/dashboard")
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        {/* Badge */}
        <span className="inline-block mb-6 px-3 py-1 text-xs font-semibold tracking-widest uppercase rounded-full bg-brand-100 text-brand-600">
          Student Performance Intelligence
        </span>

        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] max-w-3xl">
          Know exactly how{" "}
          <span className="text-brand-600">you learn.</span>
        </h1>

        <p className="mt-6 text-lg text-slate-500 max-w-xl leading-relaxed">
          Upload questions, solve them, challenge friends — and get a full
          breakdown of your accuracy, speed, knowledge, and consistency.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href="/register"
            className="px-7 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors shadow-sm"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="px-7 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-white transition-colors"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-t border-slate-200 bg-white py-14 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { icon: "🎯", label: "Accuracy Score" },
            { icon: "⚡", label: "Speed Score" },
            { icon: "🧠", label: "Knowledge Score" },
            { icon: "🔥", label: "Consistency Streak" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <span className="text-3xl">{icon}</span>
              <span className="text-sm font-semibold text-slate-700">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-10">
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Upload questions",
                desc: "Add MCQ questions with difficulty levels and subjects.",
              },
              {
                step: "02",
                title: "Solve & compete",
                desc: "Answer questions under timed conditions. Every second counts.",
              },
              {
                step: "03",
                title: "Get your DNA report",
                desc: "See your rank, strengths, weaknesses, and personalized advice.",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"
              >
                <span className="text-xs font-bold tracking-widest text-brand-400">
                  {step}
                </span>
                <h3 className="mt-2 font-bold text-slate-800">{title}</h3>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200">
        LearnArena © {new Date().getFullYear()}
      </footer>
    </div>
  )
}
