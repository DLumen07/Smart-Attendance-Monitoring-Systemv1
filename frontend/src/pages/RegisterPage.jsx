import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AuthLayout from '../auth/AuthLayout'
import { Mail, Lock, UserPlus, Phone, Loader2, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const input = 'w-full pl-12 pr-5 h-14 bg-slate-50/70 border border-slate-200 text-ink placeholder-slate-400 rounded-[1.1rem] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-200 text-[15px] font-medium'
  const plainInput = 'w-full px-5 h-14 bg-slate-50/70 border border-slate-200 text-ink placeholder-slate-400 rounded-[1.1rem] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-200 text-[15px] font-medium'
  const fieldErrorClass = 'border-rose-300 focus:ring-rose-200 focus:border-rose-400'

  const sanitizeName = (value) => value.replace(/[^A-Za-z'\- ]+/g, '').replace(/\s+/g, ' ')
  const sanitizePhone = (value) => value.replace(/[^\d+\-()\s]/g, '')
  const sanitizeEmail = (value) => value.replace(/\s+/g, '')

  const validateName = (value, label) => {
    if (!value) return `${label} is required.`
    if (value.length > 40) return `${label} is too long.`
    if (!/^[A-Za-z][A-Za-z'\- ]*$/.test(value)) {
      return `${label} can only contain letters, spaces, apostrophes, and hyphens.`
    }
    return ''
  }

  const validateEmail = (value, label = 'Email') => {
    if (!value) return `${label} is required.`
    if (value.length > 190) return `${label} is too long.`
    if (!/[A-Za-z]/.test(value)) return `${label} must include letters.`
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `${label} is invalid.`
    return ''
  }

  const validateStrongPassword = (value) => {
    if (!value) return 'Password is required.'
    if (value.length < 10) return 'Password must be at least 10 characters.'
    if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.'
    if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.'
    if (!/\d/.test(value)) return 'Password must include a number.'
    if (!/[^A-Za-z0-9]/.test(value)) return 'Password must include a symbol (!@#$%^&*).'
    return ''
  }

  const trimForm = () => ({
    ...form,
    firstName: form.firstName.trim().replace(/\s+/g, ' '),
    middleName: form.middleName.trim().replace(/\s+/g, ' '),
    lastName: form.lastName.trim().replace(/\s+/g, ' '),
    email: form.email.trim().toLowerCase(),
    parentName: form.parentName.trim().replace(/\s+/g, ' '),
    parentEmail: form.parentEmail.trim().toLowerCase(),
    parentPhone: sanitizePhone(form.parentPhone.trim()),
  })

  const validateForm = (cleaned) => {
    const nextErrors = {}

    const firstNameError = validateName(cleaned.firstName, 'First name')
    if (firstNameError) nextErrors.firstName = firstNameError

    const lastNameError = validateName(cleaned.lastName, 'Last name')
    if (lastNameError) nextErrors.lastName = lastNameError

    if (cleaned.middleName) {
      const middleNameError = validateName(cleaned.middleName, 'Middle name')
      if (middleNameError) nextErrors.middleName = middleNameError
    }

    const emailError = validateEmail(cleaned.email)
    if (emailError) nextErrors.email = emailError

    const passwordError = validateStrongPassword(cleaned.password)
    if (passwordError) nextErrors.password = passwordError
    if (cleaned.password !== cleaned.confirmPassword) nextErrors.confirmPassword = 'Password and confirm password must match.'

    if (cleaned.parentEmail) {
      const parentEmailError = validateEmail(cleaned.parentEmail, 'Parent email')
      if (parentEmailError) nextErrors.parentEmail = parentEmailError
    }

    if (cleaned.parentName) {
      const parentNameError = validateName(cleaned.parentName, 'Parent name')
      if (parentNameError) nextErrors.parentName = parentNameError
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')

    const cleaned = trimForm()
    if (!validateForm(cleaned)) {
      setError('Please fix the highlighted fields before creating your account.')
      return
    }

    setLoading(true)
    try {
      const result = await register(cleaned)
      if (cleaned.role === 'instructor' && !result?.token) {
        setNotice(result?.message || 'Instructor registration submitted. Please wait for admin approval.')
        setTimeout(() => navigate('/login'), 1800)
      } else {
        navigate('/login')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create Account" subtitle="Set up your Smart Attendance access in under a minute" wide={true}>
      <form onSubmit={onSubmit} className="flex flex-col space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-8 items-stretch">
          <section className="h-full rounded-[28px] border border-slate-200/70 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)] p-6 sm:p-7 lg:p-8 space-y-6 flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-1">Create your account</h3>
                <p className="text-[14px] text-slate-500 max-w-[42ch]">Give each field room to breathe. The layout is meant to feel calm, not crowded.</p>
              </div>
              <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1c1c1c] text-white shadow-[0_10px_24px_rgba(28,28,28,0.18)]">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-bold text-ink mb-2">Full Name</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field icon={UserPlus} placeholder="First name" value={form.firstName} error={fieldErrors.firstName} onChange={(value) => setForm((p) => ({ ...p, firstName: sanitizeName(value) }))} onBlur={(value) => setForm((p) => ({ ...p, firstName: value.trim().replace(/\s+/g, ' ') }))} required />
                  <Field icon={UserPlus} placeholder="Last name" value={form.lastName} error={fieldErrors.lastName} onChange={(value) => setForm((p) => ({ ...p, lastName: sanitizeName(value) }))} onBlur={(value) => setForm((p) => ({ ...p, lastName: value.trim().replace(/\s+/g, ' ') }))} required />
                </div>
                <div className="mt-4">
                  <label className="block text-[13px] font-bold text-ink mb-2">Middle Name <span className="font-medium text-slate-400">(optional)</span></label>
                  <input
                    className={`${plainInput} ${fieldErrors.middleName ? fieldErrorClass : ''}`}
                    placeholder="Middle name"
                    value={form.middleName}
                    onChange={(e) => setForm((p) => ({ ...p, middleName: sanitizeName(e.target.value) }))}
                    onBlur={(e) => setForm((p) => ({ ...p, middleName: e.target.value.trim().replace(/\s+/g, ' ') }))}
                  />
                  {fieldErrors.middleName && <p className="mt-1 text-[12px] text-rose-600">{fieldErrors.middleName}</p>}
                </div>
                {(fieldErrors.firstName || fieldErrors.lastName) && <p className="mt-2 text-[12px] text-rose-600">{fieldErrors.firstName || fieldErrors.lastName}</p>}
              </div>

              <div>
                <label className="block text-[13px] font-bold text-ink mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    required
                    type="email"
                    className={`${input} ${fieldErrors.email ? fieldErrorClass : ''}`}
                    placeholder="you@mail.com"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: sanitizeEmail(e.target.value) }))}
                    onBlur={(e) => setForm((p) => ({ ...p, email: e.target.value.trim().toLowerCase() }))}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Use a real email format like name@example.com.</p>
                {fieldErrors.email && <p className="mt-1 text-[12px] text-rose-600">{fieldErrors.email}</p>}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-ink mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      minLength={10}
                      className={`w-full pl-11 pr-11 h-14 bg-slate-50/70 border border-slate-200 text-ink placeholder-slate-400 rounded-[1.1rem] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-200 text-[15px] font-medium ${fieldErrors.password ? fieldErrorClass : ''}`}
                      placeholder="Create a password"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-ink transition-colors" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">10+ characters with uppercase, lowercase, number, and symbol.</p>
                  {fieldErrors.password && <p className="mt-1 text-[12px] text-rose-600">{fieldErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-ink mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      required
                      type={showConfirmPassword ? 'text' : 'password'}
                      minLength={10}
                      className={`w-full pl-11 pr-11 h-14 bg-slate-50/70 border border-slate-200 text-ink placeholder-slate-400 rounded-[1.1rem] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-200 text-[15px] font-medium ${fieldErrors.confirmPassword ? fieldErrorClass : ''}`}
                      placeholder="Repeat password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-ink transition-colors" onClick={() => setShowConfirmPassword((prev) => !prev)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <p className="mt-1 text-[12px] text-rose-600">{fieldErrors.confirmPassword}</p>}
                </div>
              </div>

            </div>
          </section>

          <section className="h-full rounded-[28px] border border-slate-200/70 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)] p-6 sm:p-7 lg:p-8 space-y-6 flex flex-col">
            <div>
              <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-1">Role and access</h3>
              <p className="text-[14px] text-slate-500">Pick your account type, then add parent info if you are a student.</p>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-ink mb-2">I am a...</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex justify-center items-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all ${form.role === 'student' ? 'border-[#1c1c1c] bg-[#1c1c1c] text-white shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                  <input type="radio" name="role" value="student" className="hidden" checked={form.role === 'student'} onChange={() => setForm((p) => ({ ...p, role: 'student' }))} />
                  <span className="text-[13px] font-bold">Student</span>
                </label>
                <label className={`flex justify-center items-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all ${form.role === 'instructor' ? 'border-[#1c1c1c] bg-[#1c1c1c] text-white shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                  <input type="radio" name="role" value="instructor" className="hidden" checked={form.role === 'instructor'} onChange={() => setForm((p) => ({ ...p, role: 'instructor' }))} />
                  <span className="text-[13px] font-bold">Instructor</span>
                </label>
              </div>
            </div>

            {form.role === 'student' ? (
              <div className="space-y-4 pt-1 mt-5 border-t border-slate-100 flex-1">
                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mt-4">Parent/Guardian Info (Optional)</p>
                <div>
                  <div className="relative">
                    <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input className={`${input} ${fieldErrors.parentName ? fieldErrorClass : ''}`} placeholder="Parent Name" value={form.parentName} onChange={(e) => setForm((p) => ({ ...p, parentName: sanitizeName(e.target.value) }))} />
                  </div>
                  {fieldErrors.parentName && <p className="mt-1 text-[12px] text-rose-600">{fieldErrors.parentName}</p>}
                </div>
                <div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="email" className={`${input} ${fieldErrors.parentEmail ? fieldErrorClass : ''}`} placeholder="Parent Email" value={form.parentEmail} onChange={(e) => setForm((p) => ({ ...p, parentEmail: sanitizeEmail(e.target.value) }))} />
                  </div>
                  {fieldErrors.parentEmail && <p className="mt-1 text-[12px] text-rose-600">{fieldErrors.parentEmail}</p>}
                </div>
                <div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="tel" className={input} placeholder="Parent Phone" value={form.parentPhone} onChange={(e) => setForm((p) => ({ ...p, parentPhone: sanitizePhone(e.target.value) }))} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Allowed: digits, +, -, spaces, and parentheses.</p>
                </div>
              </div>
            ) : (
              <div className="mt-[28px] rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 min-h-[220px] flex flex-col justify-center flex-1">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-[1rem] flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5 text-[#1c1c1c]" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-ink">Instructor Account</p>
                    <p className="text-xs text-slate-500 max-w-[280px] leading-relaxed">Instructor requests are reviewed by an admin before login access is granted.</p>
                    <div className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#18563e] bg-[#eaf4ef] px-3 py-2 rounded-full">
                      <ShieldCheck className="w-4 h-4" /> Approval required
                    </div>
                  </div>
                </div>
              </div>
            )}

          </section>
        </div>

        <div className="pt-6 mt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="text-[13px] text-slate-500 font-medium w-full sm:w-auto text-center sm:text-left">
            Already have an account? <Link to="/login" className="font-bold text-[#1c1c1c] hover:underline transition-colors">Sign in</Link>
          </div>

          <div className="w-full sm:w-auto flex flex-col items-end">
            {error && (
              <div className="text-[13px] text-rose-600 font-medium mb-3 bg-rose-50/50 p-2 px-3 rounded-lg border border-rose-100 w-full sm:w-auto inline-flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            {notice && (
              <div className="text-[13px] text-emerald-700 font-medium mb-3 bg-emerald-50 p-2 px-3 rounded-lg border border-emerald-100 w-full sm:w-auto inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {notice}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto sm:min-w-[200px] h-14 flex items-center justify-center gap-2 bg-[#1c1c1c] hover:bg-black text-white font-bold rounded-[1.1rem] transition-all duration-200 shadow-[0_4px_16px_rgba(28,28,28,0.2)] hover:shadow-[0_6px_20px_rgba(28,28,28,0.3)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group px-6"
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

function Field({ icon: Icon, placeholder, value, error, onChange, onBlur, required }) {
  return (
    <div>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          required={required}
          className={`w-full pl-11 pr-4 h-14 bg-slate-50/70 border text-ink placeholder-slate-400 rounded-[1.1rem] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-200 text-[15px] font-medium ${error ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400' : 'border-slate-200'}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur?.(e.target.value)}
        />
      </div>
      {error && <p className="mt-1 text-[12px] text-rose-600">{error}</p>}
    </div>
  )
}

