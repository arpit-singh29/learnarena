"use client"
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { notificationsApi, NotificationItem } from "@/lib/api"

const TYPE_ICON: Record<string, string> = {
  friend_request:      "👥",
  friend_accepted:     "✅",
  challenge_received:  "⚔️",
  challenge_accepted:  "🎮",
  challenge_completed: "🏆",
  badge_earned:        "🏅",
}

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 60)    return "just now"
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [notifs, setNotifs]       = useState<NotificationItem[]>([])
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    notificationsApi.getAll()
      .then(res => setNotifs(res.data))
      .finally(() => setPageLoading(false))

    // Mark all as read when page opens
    notificationsApi.markAllRead()
  }, [user])

  const handleClick = async (n: NotificationItem) => {
    await notificationsApi.markOneRead(n.id)
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
    if (n.link) router.push(n.link)
  }

  if (loading || pageLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin"/>
    </div>
  )

  const unread = notifs.filter(n => !n.is_read)
  const read   = notifs.filter(n => n.is_read)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-900">🔔 Notifications</h1>
        {unread.length > 0 && (
          <button
            onClick={() => {
              notificationsApi.markAllRead()
              setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
            }}
            className="text-xs text-brand-600 font-semibold hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-5xl mb-3">🔔</p>
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm mt-1">We'll notify you when something happens!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {unread.length > 0 && (
            <>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New</p>
              {unread.map(n => (
                <div key={n.id} onClick={() => handleClick(n)}
                  className="flex items-start gap-4 p-4 bg-brand-50 border border-brand-100 rounded-2xl cursor-pointer hover:bg-brand-100 transition-colors">
                  <span className="text-2xl shrink-0">{TYPE_ICON[n.type] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm">{n.title}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                </div>
              ))}
            </>
          )}

          {read.length > 0 && (
            <>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-5 mb-2">Earlier</p>
              {read.map(n => (
                <div key={n.id} onClick={() => handleClick(n)}
                  className="flex items-start gap-4 p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <span className="text-2xl shrink-0 opacity-50">{TYPE_ICON[n.type] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-600 text-sm">{n.title}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{n.message}</p>
                  </div>
                  <span className="text-xs text-slate-300 shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
