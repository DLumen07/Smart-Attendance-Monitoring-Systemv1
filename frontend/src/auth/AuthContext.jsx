import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../api/client'

const AuthContext = createContext(null)

const TOKEN_KEY = 'attendance_token'
const USER_KEY = 'attendance_user'

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  useEffect(() => {
    const handleStorage = (event) => {
      if (!event.key || event.key === USER_KEY || event.key === TOKEN_KEY) {
        setUser(readStoredUser())
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const saveSession = (token, nextUser) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  const register = async (form) => {
    if (user) {
      throw new Error(`A ${user.role} account (${user.email}) is already logged in. Please log out first before creating a new account.`)
    }

    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    if (data?.token && data?.user) {
      saveSession(data.token, data.user)
    }
    return data
  }

  const login = async (form) => {
    if (user) {
      throw new Error(`A ${user.role} account (${user.email}) is already logged in. Please log out first before logging in with a different account.`)
    }

    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    saveSession(data.token, data.user)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)

    setUser(null)
  }

  const updateProfile = async (payload) => {
    const data = await apiRequest('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (data?.token && data?.user) {
      saveSession(data.token, data.user)
    }

    return data
  }

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateProfile,
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
