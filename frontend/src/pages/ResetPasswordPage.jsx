import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Key, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { apiRequest } from '../api/client'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const initialEmail = searchParams.get('email') || ''
  const [form, setForm] = useState({
    email: initialEmail,
    code: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const normalizeCode = (value) => value.replace(/\D/g, '').slice(0, 6)

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          code: form.code,
          password: form.password,
        }),
      })
      setMessage(response.message || 'Password updated successfully.')
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
            <Key className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Reset Password</h1>
          <p className="text-slate-500 text-sm">Enter your reset code and choose a new password.</p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              required
              type="email"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand focus:bg-white transition-all duration-200"
              placeholder="you@example.com"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reset Code</label>
            <input
              required
              type="text"
              maxLength={6}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand focus:bg-white transition-all duration-200 tracking-[0.4em] text-center uppercase"
              placeholder="000000"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: normalizeCode(event.target.value) }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                required
                type="password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand focus:bg-white transition-all duration-200"
                placeholder="New password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <input
              required
              type="password"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand focus:bg-white transition-all duration-200"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50/50 border border-red-100 rounded-lg flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {message && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700 font-medium">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full relative flex items-center justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-brand hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand transition-all duration-200 active:scale-[0.98] shadow-md shadow-brand/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Need a new code?{' '}
            <Link to="/forgot-password" className="font-semibold text-brand hover:text-brand-600 hover:underline transition-all">
              Send another
            </Link>
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Remembered your password?{' '}
            <Link to="/login" className="font-semibold text-brand hover:text-brand-600 hover:underline transition-all">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
