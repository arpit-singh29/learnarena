"use client"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-brand-600">
            Learn<span className="text-slate-800">Arena</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {user && (
            <>
              <Link href="/dashboard" className="hover:text-brand-600 transition-colors">
                Dashboard
              </Link>
              <Link href="/analytics" className="hover:text-brand-600 transition-colors">
                Analytics
              </Link>
              <Link href="/dna" className="hover:text-brand-600 transition-colors">
                DNA Report
              </Link>
              <Link href="/leaderboard" className="hover:text-brand-600 transition-colors">
                Leaderboard
              </Link>
            </>
          )}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm text-slate-500">
                Hi, <span className="font-semibold text-slate-700">{user.username}</span>
              </span>
              <button
                onClick={logout}
                className="text-sm px-4 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-slate-600 hover:text-brand-600 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm px-4 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
