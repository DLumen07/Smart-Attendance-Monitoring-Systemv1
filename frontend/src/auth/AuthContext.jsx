import { createContext, useContext, useMemo, useState } from 'react'
import { apiRequest } from '../api/client'

const AuthContext = createContext(null)

const TOKEN_KEY = 'attendance_token'
const USER_KEY = 'attendance_user'

function readStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  const saveSession = (token, nextUser) => {
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  const register = async (form) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    saveSession(data.token, data.user)
  }

  const login = async (form) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    saveSession(data.token, data.user)
  }

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)

    setUser(null)
  }

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    register,
    login,
    logout,
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
