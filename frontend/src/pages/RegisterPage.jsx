import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AuthLayout from '../auth/AuthLayout'
import { Mail, Lock, UserPlus, Phone, Loader2, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'student', parentName: '', parentEmail: '', parentPhone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const input = 'w-full pl-11 pr-4 h-12 bg-slate-50/50 border border-slate-200 text-ink placeholder-slate-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-200 text-[14px] font-medium'

  return (
    <AuthLayout title="Create Account" subtitle="Get started with Smart Attendance" wide={true}>
      <form onSubmit={onSubmit} className="flex flex-col space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* Column 1: Account Info */}
           <div className="space-y-4">
              <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">1. Account Details</h3>
              
              <div>
                <label className="block text-[13px] font-bold text-ink mb-2">Full Name</label>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input required className={input} placeholder="Jane Doe" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-ink mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input required type="email" className={input} placeholder="you@mail.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-ink mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input required type="password" minLength={8} className={input} placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                </div>
              </div>
           </div>

           {/* Column 2: Role & Additional Info */}
           <div className="space-y-4">
              <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">2. Role Profile</h3>
              
              <div>
                <label className="block text-[13px] font-bold text-ink mb-2">I am a...</label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex justify-center items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.role === 'student' ? 'border-[#1c1c1c] bg-[#1c1c1c] text-white shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                    <input type="radio" name="role" value="student" className="hidden" checked={form.role === 'student'} onChange={() => setForm((p) => ({ ...p, role: 'student' }))} />
                    <span className="text-[13px] font-bold">Student</span>
                  </label>
                  <label className={`flex-1 flex justify-center items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.role === 'instructor' ? 'border-[#1c1c1c] bg-[#1c1c1c] text-white shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                    <input type="radio" name="role" value="instructor" className="hidden" checked={form.role === 'instructor'} onChange={() => setForm((p) => ({ ...p, role: 'instructor' }))} />
                    <span className="text-[13px] font-bold">Instructor</span>
                  </label>
                </div>
              </div>

              {form.role === 'student' ? (
                <div className="space-y-4 pt-1">
                   <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mt-4">Parent/Guardian Info (Optional)</p>
                   
                   <div>
                     <div className="relative">
                       <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                       <input className={input} placeholder="Parent Name" value={form.parentName} onChange={(e) => setForm((p) => ({ ...p, parentName: e.target.value }))} />
                     </div>
                   </div>

                   <div>
                     <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                       <input type="email" className={input} placeholder="Parent Email" value={form.parentEmail} onChange={(e) => setForm((p) => ({ ...p, parentEmail: e.target.value }))} />
                     </div>
                   </div>

                   <div>
                     <div className="relative">
                       <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                       <input type="tel" className={input} placeholder="Parent Phone" value={form.parentPhone} onChange={(e) => setForm((p) => ({ ...p, parentPhone: e.target.value }))} />
                     </div>
                   </div>
                </div>
              ) : (
                <div className="mt-[28px] pt-4 pb-8 text-center flex flex-col items-center justify-center space-y-3 bg-slate-50 border border-slate-200/60 rounded-2xl h-[196px]">
                   <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-[1rem] flex items-center justify-center mb-1">
                      <UserPlus className="w-5 h-5 text-[#1c1c1c]" />
                   </div>
                   <p className="text-sm font-bold text-ink">Instructor Account</p>
                   <p className="text-xs text-slate-500 max-w-[200px]">You will have access to create and manage classes immediately upon registration.</p>
                </div>
              )}
           </div>
        </div>

        {/* Footer / Submit */}
        <div className="pt-6 mt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="text-[13px] text-slate-500 font-medium w-full sm:w-auto text-center sm:text-left">
             Already have an account? <Link to="/login" className="font-bold text-[#1c1c1c] hover:underline transition-colors">Sign in</Link>
          </div>
          
          <div className="w-full sm:w-auto flex flex-col items-end">
             {error && <div className="text-[13px] text-rose-600 font-medium mb-3 bg-rose-50/50 p-2 px-3 rounded-lg border border-rose-100 w-full sm:w-auto">{error}</div>}
             <button
               type="submit"
               disabled={loading}
               className="w-full sm:w-auto sm:min-w-[180px] h-12 flex items-center justify-center gap-2 bg-[#1c1c1c] hover:bg-black text-white font-bold rounded-[1rem] transition-all duration-200 shadow-[0_4px_16px_rgba(28,28,28,0.2)] hover:shadow-[0_6px_20px_rgba(28,28,28,0.3)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group px-6"
             >
               {loading ? (
                 <>
                   <Loader2 className="h-4 w-4 animate-spin" />
                   <span>Creating...</span>
                 </>
               ) : (
                 <>
                   <span>Create Account</span>
                   <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                 </>
               )}
             </button>
          </div>
        </div>

      </form>
    </AuthLayout>
  )
}
