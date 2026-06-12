"use client"
import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { authApi, User } from "@/lib/api"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // On mount: check if token exists and fetch user
  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      setLoading(false)
      return
    }
    authApi.me()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    localStorage.setItem("access_token", data.access_token)
    localStorage.setItem("refresh_token", data.refresh_token)
    const me = await authApi.me()
    setUser(me.data)
    router.push("/dashboard")
  }

  const logout = () => {
    authApi.logout().catch(() => {})
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
