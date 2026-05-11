import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AuthLayout from '../auth/AuthLayout'
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react'

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

  const input = 'w-full pl-11 pr-4 h-12 bg-slate-50/50 border border-slate-200 text-ink placeholder-slate-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-200 text-[14px] font-medium'

  return (
    <AuthLayout title="Welcome Back" subtitle="Please sign in to your account">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-[13px] font-bold text-ink mb-2">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              required
              type="email"
              className={input}
              placeholder="you@mail.com"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-[13px] font-bold text-ink">Password</label>
            <Link to="/forgot-password" className="text-[12px] font-bold text-brand hover:text-teal-800 transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              required
              type="password"
              className={input}
              placeholder="••••••••"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </div>
        </div>

        {error && (
          <div className="text-[13px] text-rose-600 font-medium bg-rose-50/50 p-3 rounded-lg border border-rose-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 h-12 flex items-center justify-center gap-2 bg-[#1c1c1c] hover:bg-black text-white font-bold rounded-[1rem] transition-all duration-200 shadow-[0_4px_16px_rgba(28,28,28,0.2)] hover:shadow-[0_6px_20px_rgba(28,28,28,0.3)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In to Account</span>
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-100"></div>
        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">New to the platform?</span>
        <div className="flex-1 h-px bg-slate-100"></div>
      </div>

      <Link
        to="/register"
        className="w-full h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-[#1c1c1c] font-bold rounded-[1rem] transition-all duration-200 text-[14px]"
      >
        Create an Account
      </Link>
    </AuthLayout>
  )
}