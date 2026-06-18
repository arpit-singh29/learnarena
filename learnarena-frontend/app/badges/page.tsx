"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { badgesApi, BadgeItem } from "@/lib/api"

export default function BadgesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [badges, setBadges]           = useState<BadgeItem[]>([])
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    badgesApi.me()
      .then(res => setBadges(res.data))
      .catch(() => {})
      .finally(() => setPageLoading(false))
  }, [user])

  if (loading || pageLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin"/>
    </div>
  )

  const earned  = badges.filter(b => b.earned)
  const locked  = badges.filter(b => !b.earned)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-900">🏅 Badges</h1>
        <span className="text-sm font-semibold text-slate-500">
          {earned.length} / {badges.length} earned
        </span>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Collection progress</span>
          <span className="text-sm font-black text-brand-600">
            {badges.length ? Math.round((earned.length / badges.length) * 100) : 0}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${badges.length ? (earned.length / badges.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Earned badges */}
      {earned.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-slate-700 mb-3">✅ Earned ({earned.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {earned.map(b => (
              <div key={b.id}
                className="bg-white rounded-2xl border border-emerald-200 p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                <p className="text-4xl mb-2">{b.icon}</p>
                <p className="font-bold text-slate-800 text-sm">{b.name}</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{b.description}</p>
                <span className="mt-2 inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                  Earned ✓
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-700 mb-3">🔒 Locked ({locked.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {locked.map(b => (
              <div key={b.id}
                className="bg-white rounded-2xl border border-slate-100 p-5 text-center opacity-60 hover:opacity-80 transition-opacity">
                <p className="text-4xl mb-2 grayscale">{b.icon}</p>
                <p className="font-bold text-slate-600 text-sm">{b.name}</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{b.description}</p>
                <span className="mt-2 inline-block px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full">
                  🔒 Locked
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {badges.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-5xl mb-3">🏅</p>
          <p className="font-medium">No badges loaded yet.</p>
          <p className="text-sm mt-1">Solve some questions to start earning!</p>
        </div>
      )}
    </div>
  )
}
