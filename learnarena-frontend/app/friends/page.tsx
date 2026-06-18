"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { friendsApi, Friend, FriendRequest, SearchUser } from "@/lib/api"

export default function FriendsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [friends, setFriends]             = useState<Friend[]>([])
  const [incoming, setIncoming]           = useState<FriendRequest[]>([])
  const [searchQ, setSearchQ]             = useState("")
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching]         = useState(false)
  const [pageLoading, setPageLoading]     = useState(true)
  const [msg, setMsg]                     = useState("")

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  const load = async () => {
    if (!user) return
    const [fl, ir] = await Promise.all([friendsApi.list(), friendsApi.incoming()])
    setFriends(fl.data)
    setIncoming(ir.data)
    setPageLoading(false)
  }

  useEffect(() => { load() }, [user])

  const handleSearch = async () => {
    if (!searchQ.trim()) return
    setSearching(true)
    const res = await friendsApi.search(searchQ)
    setSearchResults(res.data)
    setSearching(false)
  }

  const sendReq = async (id: number) => {
    try {
      await friendsApi.sendRequest(id)
      setMsg("Friend request sent!")
      setSearchResults(prev =>
        prev.map(u => u.id === id ? { ...u, friend_status: "pending" } : u)
      )
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || "Already sent or error")
    }
    setTimeout(() => setMsg(""), 3000)
  }

  const accept = async (id: number) => {
    await friendsApi.accept(id)
    load()
  }

  const reject = async (id: number) => {
    await friendsApi.reject(id)
    load()
  }

  const remove = async (id: number) => {
    await friendsApi.remove(id)
    load()
  }

  const statusButton = (u: SearchUser) => {
    if (u.friend_status === "accepted") {
      return (
        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
          ✓ Friends
        </span>
      )
    }
    if (u.friend_status === "pending") {
      return (
        <span className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg">
          ⏳ Pending
        </span>
      )
    }
    return (
      <button onClick={() => sendReq(u.id)}
        className="px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors">
        Add friend
      </button>
    )
  }

  if (loading || pageLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin"/>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-slate-900 mb-6">👥 Friends</h1>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
        <p className="font-semibold text-slate-700 mb-3">Find students</p>
        <div className="flex gap-2">
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search by username…"
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"/>
          <button onClick={handleSearch} disabled={searching}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors">
            {searching ? "…" : "Search"}
          </button>
        </div>

        {msg && <p className="mt-2 text-sm text-emerald-600 font-medium">{msg}</p>}

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                    {u.username[0].toUpperCase()}
                  </div>
                  <Link href={`/profile/${u.username}`}
                    className="font-medium text-slate-800 text-sm hover:text-brand-600 transition-colors">
                    {u.username}
                  </Link>
                </div>
                {statusButton(u)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
          <p className="font-semibold text-amber-800 mb-3">
            📬 Friend requests ({incoming.length})
          </p>
          <div className="space-y-2">
            {incoming.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                    {r.sender_username[0].toUpperCase()}
                  </div>
                  <Link href={`/profile/${r.sender_username}`}
                    className="font-medium text-slate-800 text-sm hover:text-brand-600 transition-colors">
                    {r.sender_username}
                  </Link>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => accept(r.id)}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
                    Accept
                  </button>
                  <button onClick={() => reject(r.id)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <p className="font-semibold text-slate-700 mb-3">
          My friends ({friends.length})
        </p>
        {friends.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            No friends yet. Search for students above to add them.
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
                    {f.username[0].toUpperCase()}
                  </div>
                  <Link href={`/profile/${f.username}`}
                    className="font-medium text-slate-800 hover:text-brand-600 transition-colors">
                    {f.username}
                  </Link>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/challenges?opponent=${f.id}&name=${f.username}`)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                    ⚔️ Challenge
                  </button>
                  <button onClick={() => remove(f.id)}
                    className="px-3 py-1.5 border border-red-200 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
