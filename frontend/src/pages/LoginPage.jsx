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
      const user = JSON.parse(localStorage.getItem('attendance_user') || 'null')
      navigate(user?.role === 'instructor' ? '/instructor' : '/student')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account to continue.</p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email Address</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                required
                type="email"
                className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 transition-colors shadow-sm outline-none"
                placeholder="you@example.com"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                required
                type="password"
                className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 transition-colors shadow-sm outline-none"
                placeholder="••••••••"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-4 border border-red-100 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group flex w-full justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-brand hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <p className="text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link className="font-semibold text-brand hover:text-brand-600 transition-colors" to="/register">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
