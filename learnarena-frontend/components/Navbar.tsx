// learnarena-frontend/components/Navbar.tsx
"use client"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { notificationsApi } from "@/lib/api"

export default function Navbar() {
  const { user, logout } = useAuth()
  const path   = usePathname()
  const router = useRouter()

  const [unreadCount, setUnreadCount] = useState(0)

  const links = [
    { href: "/dashboard",   label: "Dashboard" },
    { href: "/analytics",   label: "Analytics" },
    { href: "/dna",         label: "DNA Report" },
    { href: "/challenges",  label: "Challenges" },
    { href: "/friends",     label: "Friends" },
    { href: "/badges",      label: "Badges" },
    { href: "/leaderboard", label: "Leaderboard" },
  ]

  // Poll unread count every 30 seconds
  useEffect(() => {
    if (!user) return

    const fetchCount = () => {
      notificationsApi.unreadCount()
        .then(res => setUnreadCount(res.data.count))
        .catch(() => {})
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  // Reset count when visiting notifications page
  useEffect(() => {
    if (path === "/notifications") {
      setUnreadCount(0)
    }
  }, [path])

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-black tracking-tight text-brand-600 shrink-0">
          Learn<span className="text-slate-800">Arena</span>
        </Link>

        {user && (
          <div className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {links.map(({ href, label }) => (
              <Link key={href} href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  path === href
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:text-brand-600 hover:bg-slate-50"
                }`}>
                {label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <>
              {/* 🔔 Notification Bell */}
              <button
                onClick={() => router.push("/notifications")}
                className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-600" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              <span className="hidden sm:block text-sm text-slate-500">
                Hi, <span className="font-semibold text-slate-700">{user.username}</span>
              </span>
              <button onClick={logout}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-600 hover:text-brand-600 transition-colors">Log in</Link>
              <Link href="/register" className="text-sm px-4 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
