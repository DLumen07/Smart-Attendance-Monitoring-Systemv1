import { useState, useEffect } from 'react'
import AuthLayout from '../auth/AuthLayout'
import { apiRequest } from '../api/client'
import { Link, useSearchParams } from 'react-router-dom'
import { Mail, KeyRound, Lock, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const initialEmail = searchParams.get('email') || ''
  
  const [form, setForm] = useState({ email: initialEmail, code: '', password: '' })
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setStatus('')
    setLoading(true)
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setSuccess(true)
    } catch (err) {
      setStatus(err.message || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
      return (
         <AuthLayout title="Password Reset" subtitle="Your password has been successfully updated">
             <div className="text-center space-y-6">
                 <div className="flex justify-center">
                   <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center">
                       <CheckCircle className="w-8 h-8 text-brand" />
                   </div>
                 </div>
                 
                 <p className="text-sm text-slate-500">
                    You can now sign in with your new password.
                 </p>
     
                 <Link
                    to="/login"
                    className="w-full h-12 flex items-center justify-center bg-brand hover:bg-teal-800 text-white font-bold rounded-full transition-all duration-200 shadow-xl shadow-brand/20 text-[14px]"
                 >
                    Go to Sign In
                 </Link>
             </div>
         </AuthLayout>
      )
  }

  const input = 'w-full pl-11 pr-4 h-12 bg-slate-50/50 border border-slate-200 text-ink placeholder-slate-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-200 text-[14px] font-medium'
  const passwordInput = 'w-full pl-11 pr-12 h-12 bg-slate-50/50 border border-slate-200 text-ink placeholder-slate-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-200 text-[14px] font-medium'

  return (
    <AuthLayout title="Confirm Reset" subtitle="Enter your reset code and new password">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-bold text-ink mb-2">Email</label>
          <div className="relative">
             <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
             <input required type="email" className={input} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="you@mail.com" />
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-bold text-ink mb-2">Reset Code</label>
          <div className="relative">
             <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
             <input required className={input} value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="6-digit code" />
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-bold text-ink mb-2">New Password</label>
          <div className="relative">
             <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
             <input required type={showPassword ? 'text' : 'password'} className={passwordInput} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="At least 8 characters" />
             <button
               type="button"
               onClick={() => setShowPassword((prev) => !prev)}
               className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink transition-colors"
               aria-label={showPassword ? 'Hide password' : 'Show password'}
             >
               {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
             </button>
          </div>
        </div>

        {status && <div className="text-[13px] text-rose-600 font-medium">{status}</div>}

        <button type="submit" disabled={loading} className="w-full mt-2 h-12 bg-brand hover:bg-teal-800 text-white rounded-full flex items-center justify-center gap-2 font-bold transition-colors">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin"/> Resetting</> : 'Reset Password'}
        </button>
      </form>
      
      <div className="mt-6 text-center text-sm text-slate-500">
         <Link to="/login" className="font-semibold text-brand hover:text-teal-800 transition-colors">Cancel</Link>
      </div>
    </AuthLayout>
  )
}
