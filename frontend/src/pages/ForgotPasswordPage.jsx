import { useState } from 'react'
import AuthLayout from '../auth/AuthLayout'
import { Mail, CheckCircle } from 'lucide-react'
import { apiRequest } from '../api/client'
import { Link } from 'react-router-dom'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setStatus('')
    setLoading(true)
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setStatus('If an account exists, a reset code has been sent to that email.')
      setSubmitted(true)
    } catch (err) {
      setStatus(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const input = 'w-full pl-11 pr-4 h-12 bg-slate-50/50 border border-slate-200 text-ink placeholder-slate-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-200 text-[14px] font-medium'

  if (submitted) {
    return (
      <AuthLayout title="Check Your Email" subtitle={`We sent a reset code to ${email}`}>
         <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-brand" />
              </div>
            </div>
            
            <p className="text-sm text-slate-500">
               Didn't receive the code? Check your spam folder or try resetting again.
            </p>

            <Link
               to={`/reset-password?email=${encodeURIComponent(email)}`}
               className="w-full h-12 flex items-center justify-center bg-brand hover:bg-teal-800 text-white font-bold rounded-full transition-all duration-200 shadow-xl shadow-brand/20 text-[14px]"
            >
               Enter Reset Code
            </Link>

            <button
               onClick={() => { setSubmitted(false); setStatus(''); }}
               className="w-full h-12 text-slate-500 hover:text-ink font-bold transition-colors text-[14px]"
            >
               Use Different Email
            </button>
         </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset Password" subtitle="Enter your account email to receive a reset code">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-bold text-ink mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input required type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mail.com" />
          </div>
        </div>

        {status && <div className="text-[13px] text-rose-600 font-medium">{status}</div>}

        <button type="submit" disabled={loading} className="w-full h-12 bg-brand hover:bg-teal-800 text-white rounded-full font-bold transition-colors">
            {loading ? 'Sending code...' : 'Send reset code'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
         Remembered? <Link to="/login" className="font-semibold text-brand hover:text-teal-800 transition-colors">Sign in</Link>
      </div>
    </AuthLayout>
  )
}
