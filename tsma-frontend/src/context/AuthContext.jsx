import { createContext, useContext, useEffect, useState } from 'react'
import { fetchMe, loginUser, logoutUser, registerUser } from '../api/auth.js'

const AuthContext = createContext(null)

const ACCESS_KEY = 'tsma_access_token'
const REFRESH_KEY = 'tsma_refresh_token'

function accessTokenHasEditorMfa() {
  try {
    const token = localStorage.getItem(ACCESS_KEY)
    if (!token) return false
    const payload = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    if (!payload) return false
    return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))).editor_mfa === true
  } catch { return false }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Mwanzoni mwa app, kama tuna access token iliyohifadhiwa, jaribu
  // kupata profile ya mtumiaji (kuendeleza session bila kumlazimu ku-login
  // upya kila akifungua tovuti).
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    fetchMe()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem(ACCESS_KEY)
        localStorage.removeItem(REFRESH_KEY)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const res = await loginUser(email, password)
    localStorage.setItem(ACCESS_KEY, res.data.access)
    localStorage.setItem(REFRESH_KEY, res.data.refresh)
    setUser(res.data.user)
    return res.data.user
  }

  async function completeLogin(access, refresh) {
    // Called only after the Editor MFA endpoint has verified the one-time code.
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
    try {
      const res = await fetchMe()
      setUser(res.data)
      return res.data
    } catch (error) {
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
      setUser(null)
      throw error
    }
  }

  async function register(data) {
    const res = await registerUser(data)
    return res.data
  }

  async function logout() {
    const refresh = localStorage.getItem(REFRESH_KEY)
    try {
      if (refresh) await logoutUser(refresh)
    } catch {
      // hata ikishindwa server-side, bado tunafuta session ya local
    }
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    setUser(null)
  }

  const value = {
    user,
    isAuthenticated: Boolean(user),
    hasEditorMfa: accessTokenHasEditorMfa(),
    loading,
    login,
    completeLogin,
    register,
    logout,
    refreshUser: () => fetchMe().then((res) => setUser(res.data)),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth lazima itumike ndani ya <AuthProvider>')
  return ctx
}
