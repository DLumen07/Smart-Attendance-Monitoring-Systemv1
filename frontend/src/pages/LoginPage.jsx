import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ArrowRight, Mail, Lock, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form)
      const user = JSON.parse(sessionStorage.getItem('attendance_user') || 'null')
      navigate(user?.role === 'instructor' ? '/instructor' : '/student')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-slate-100">
        <div className="mb-8 text-center">
          <div className="mx-auto w-12 h-12 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Welcome Back</h1>
          <p className="text-slate-500 text-sm">Please sign in to your account</p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                required
                type="email"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand focus:bg-white transition-all duration-200"
                placeholder="you@example.com"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <Link to="/forgot-password" className="text-xs text-brand hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                required
                type="password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand focus:bg-white transition-all duration-200"
                placeholder="••••••••"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50/50 border border-red-100 rounded-lg flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full relative flex items-center justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-brand hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand transition-all duration-200 active:scale-[0.98] shadow-md shadow-brand/20 disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            {!loading && <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand hover:text-brand-600 hover:underline transition-all">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
