import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/AuthContext'
import { apiRequest } from '../api/client'

const emptyForm = {
  fullName: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  parentName: '',
  parentEmail: '',
  parentPhone: '',
  yearLevel: '',
  program: '',
  section: '',
  studentId: '',
}

const YEAR_LEVEL_OPTIONS = ['1st', '2nd', '3rd', '4th']
const PROGRAM_OPTIONS = [
  'Computer Science',
  'Information Technology',
  'Information Systems',
  'Software Engineering',
  'Computer Engineering',
  'Data Science',
  'Cybersecurity',
  'Business Administration',
  'Education',
  'Nursing',
]
const fieldErrorClass = 'border-rose-300 focus:ring-rose-200 focus:border-rose-400'

const sanitizeName = (value) => value.replace(/[^A-Za-z'\- ]+/g, '').replace(/\s+/g, ' ')
const sanitizeEmail = (value) => value.replace(/\s+/g, '')
const sanitizePhone = (value) => value.replace(/[^\d+\-()\s]/g, '')
const sanitizeSection = (value) => value.replace(/[^A-Za-z0-9\- ]+/g, '').replace(/\s+/g, ' ')
const sanitizeStudentId = (value) => value.replace(/[^\d-]/g, '')

const isValidFullName = (value) => {
  if (!value || value.length > 120) return false
  if (!/^[A-Za-z][A-Za-z'\- ]+$/.test(value)) return false
  const parts = value.trim().split(' ').filter(Boolean)
  return parts.length >= 2
}

const isValidEmail = (value) => {
  if (!value || value.length > 190) return false
  if (!/[A-Za-z]/.test(value)) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const isValidSection = (value) => {
  if (!value || value.length > 80) return false
  return /^[A-Za-z0-9][A-Za-z0-9\- ]*$/.test(value)
}

const isValidStudentId = (value) => /^\d{2}-\d{2}-\d{4}$/.test(value)

const isStrongPassword = (value) => {
  if (!value || value.length < 10 || value.length > 128) return false
  return /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)
}

export default function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const isStudent = user?.role === 'student'
  const isFormDisabled = isSaving || isLoading

  const applyProfile = (nextProfile) => {
    setForm((prev) => ({
      ...prev,
      fullName: nextProfile?.fullName || '',
      email: nextProfile?.email || '',
      parentName: nextProfile?.parentName || '',
      parentEmail: nextProfile?.parentEmail || '',
      parentPhone: nextProfile?.parentPhone || '',
      yearLevel: nextProfile?.yearLevel || '',
      program: nextProfile?.program || '',
      section: nextProfile?.section || '',
      studentId: nextProfile?.studentId || '',
    }))
  }

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const data = await apiRequest('/auth/me')
        if (!isMounted) {
          return
        }
        const nextProfile = data?.user || user
        setProfile(nextProfile)
        applyProfile(nextProfile)
      } catch (error) {
        if (!isMounted) {
          return
        }
        setProfile(user)
        applyProfile(user)
        toast.error(error.message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [user?.id])

  const updateField = (field, formatter) => (event) => {
    const rawValue = event.target.value
    const value = formatter ? formatter(rawValue) : rawValue
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!user) {
      return
    }

    setFieldErrors({})

    const baseProfile = profile || user || {}
    const payload = {}
    const fullName = form.fullName.trim().replace(/\s+/g, ' ')
    const email = form.email.trim()

    if (fullName && fullName !== baseProfile.fullName) {
      payload.fullName = fullName
    }

    if (email && email !== baseProfile.email) {
      payload.email = email
    }

    if (isStudent) {
      const parentName = form.parentName.trim().replace(/\s+/g, ' ')
      const parentEmail = form.parentEmail.trim()
      const parentPhone = form.parentPhone.trim()
      const yearLevel = form.yearLevel.trim()
      const program = form.program.trim()
      const section = form.section.trim().replace(/\s+/g, ' ')
      const studentId = form.studentId.trim()

      if (parentName !== (baseProfile.parentName || '')) {
        payload.parentName = parentName
      }

      if (parentEmail !== (baseProfile.parentEmail || '')) {
        payload.parentEmail = parentEmail
      }

      if (parentPhone !== (baseProfile.parentPhone || '')) {
        payload.parentPhone = parentPhone
      }

      if (yearLevel !== (baseProfile.yearLevel || '')) {
        payload.yearLevel = yearLevel
      }

      if (program !== (baseProfile.program || '')) {
        payload.program = program
      }

      if (section !== (baseProfile.section || '')) {
        payload.section = section
      }

      if (studentId !== (baseProfile.studentId || '')) {
        payload.studentId = studentId
      }
    }

    if (form.newPassword) {
      if (!form.currentPassword) {
        setFieldErrors({ currentPassword: 'Current password is required to set a new one.' })
        toast.error('Enter your current password to set a new one.')
        return
      }
      if (form.newPassword !== form.confirmPassword) {
        setFieldErrors({ confirmPassword: 'New password and confirm password do not match.' })
        toast.error('New password and confirm password do not match.')
        return
      }
      payload.currentPassword = form.currentPassword
      payload.newPassword = form.newPassword
    }

    if (Object.keys(payload).length === 0) {
      toast.error('No changes to save.')
      return
    }

    const nextErrors = {}
    if (payload.fullName && !isValidFullName(payload.fullName)) {
      nextErrors.fullName = 'Full name must include first and last name and only letters, spaces, apostrophes, or hyphens.'
    }
    if (payload.email && !isValidEmail(payload.email)) {
      nextErrors.email = 'Email address is invalid.'
    }
    if (payload.parentName !== undefined && payload.parentName && !isValidFullName(payload.parentName)) {
      nextErrors.parentName = 'Parent name must include first and last name and only letters, spaces, apostrophes, or hyphens.'
    }
    if (payload.parentEmail !== undefined && payload.parentEmail && !isValidEmail(payload.parentEmail)) {
      nextErrors.parentEmail = 'Parent email address is invalid.'
    }
    if (payload.yearLevel !== undefined && !YEAR_LEVEL_OPTIONS.includes(payload.yearLevel)) {
      nextErrors.yearLevel = 'Year level is required.'
    }
    if (payload.program !== undefined && !PROGRAM_OPTIONS.includes(payload.program)) {
      nextErrors.program = 'Program/department is required.'
    }
    if (payload.section !== undefined && !isValidSection(payload.section)) {
      nextErrors.section = 'Section/class group is required.'
    }
    if (payload.studentId !== undefined && !isValidStudentId(payload.studentId)) {
      nextErrors.studentId = 'Student ID must match 00-00-0000.'
    }
    if (payload.newPassword && !isStrongPassword(payload.newPassword)) {
      nextErrors.newPassword = 'Password must be at least 10 characters with upper, lower, number, and symbol.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      toast.error('Please fix the highlighted fields before saving.')
      return
    }

    setIsSaving(true)
    try {
      const data = await updateProfile(payload)
      const nextProfile = data?.user || baseProfile
      setProfile(nextProfile)
      applyProfile(nextProfile)
      toast.success('Settings updated successfully.')
      setForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-white rounded-[26px] border border-slate-200/60 shadow-[0_8px_30px_rgba(17,24,39,0.06)] overflow-hidden">
        <div className="px-6 py-6 border-b border-slate-100 bg-[#fbfaf8]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 font-black">Account</p>
          <h1 className="text-[24px] font-black text-[#1c1c1c] tracking-tight mt-2">Settings</h1>
          <p className="text-[13px] text-slate-500 mt-2">Update your profile details and password.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Full name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={updateField('fullName', sanitizeName)}
                disabled={isFormDisabled}
                className={`w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20 ${fieldErrors.fullName ? fieldErrorClass : ''}`}
                placeholder="Your full name"
              />
              {fieldErrors.fullName && <p className="text-[11px] text-rose-600">{fieldErrors.fullName}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={updateField('email', sanitizeEmail)}
                disabled={isFormDisabled}
                className={`w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20 ${fieldErrors.email ? fieldErrorClass : ''}`}
                placeholder="you@example.com"
              />
              {fieldErrors.email && <p className="text-[11px] text-rose-600">{fieldErrors.email}</p>}
            </div>
          </div>

          {isStudent && (
            <div className="space-y-6 border-t border-slate-100 pt-6">
              <div>
                <p className="text-[12px] uppercase tracking-[0.3em] text-slate-400 font-black">Student details</p>
                <p className="text-[13px] text-slate-500 mt-2">Keep your academic information up to date.</p>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Year level</label>
                  <select
                    value={form.yearLevel}
                    onChange={updateField('yearLevel')}
                    disabled={isFormDisabled}
                    className={`w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20 ${fieldErrors.yearLevel ? fieldErrorClass : ''}`}
                  >
                    <option value="">Select year level</option>
                    {YEAR_LEVEL_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {fieldErrors.yearLevel && <p className="text-[11px] text-rose-600">{fieldErrors.yearLevel}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Program</label>
                  <select
                    value={form.program}
                    onChange={updateField('program')}
                    disabled={isFormDisabled}
                    className={`w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20 ${fieldErrors.program ? fieldErrorClass : ''}`}
                  >
                    <option value="">Select program</option>
                    {PROGRAM_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {fieldErrors.program && <p className="text-[11px] text-rose-600">{fieldErrors.program}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Section</label>
                  <input
                    type="text"
                    value={form.section}
                    onChange={updateField('section', sanitizeSection)}
                    disabled={isFormDisabled}
                    className={`w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20 ${fieldErrors.section ? fieldErrorClass : ''}`}
                    placeholder="Section or class group"
                  />
                  {fieldErrors.section && <p className="text-[11px] text-rose-600">{fieldErrors.section}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Student ID</label>
                  <input
                    type="text"
                    value={form.studentId}
                    onChange={updateField('studentId', sanitizeStudentId)}
                    disabled={isFormDisabled}
                    className={`w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20 ${fieldErrors.studentId ? fieldErrorClass : ''}`}
                    placeholder="00-00-0000"
                  />
                  {fieldErrors.studentId && <p className="text-[11px] text-rose-600">{fieldErrors.studentId}</p>}
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Parent name</label>
                  <input
                    type="text"
                    value={form.parentName}
                    onChange={updateField('parentName', sanitizeName)}
                    disabled={isFormDisabled}
                    className={`w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20 ${fieldErrors.parentName ? fieldErrorClass : ''}`}
                    placeholder="Parent/guardian name"
                  />
                  {fieldErrors.parentName && <p className="text-[11px] text-rose-600">{fieldErrors.parentName}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Parent email</label>
                  <input
                    type="email"
                    value={form.parentEmail}
                    onChange={updateField('parentEmail', sanitizeEmail)}
                    disabled={isFormDisabled}
                    className={`w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20 ${fieldErrors.parentEmail ? fieldErrorClass : ''}`}
                    placeholder="parent@email.com"
                  />
                  {fieldErrors.parentEmail && <p className="text-[11px] text-rose-600">{fieldErrors.parentEmail}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Parent phone</label>
                  <input
                    type="tel"
                    value={form.parentPhone}
                    onChange={updateField('parentPhone', sanitizePhone)}
                    disabled={isFormDisabled}
                    className={`w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20 ${fieldErrors.parentPhone ? fieldErrorClass : ''}`}
                    placeholder="+63 9XX XXX XXXX"
                  />
                  {fieldErrors.parentPhone && <p className="text-[11px] text-rose-600">{fieldErrors.parentPhone}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Current password</label>
              <input
                type="password"
                value={form.currentPassword}
                onChange={updateField('currentPassword')}
                disabled={isFormDisabled}
                className={`w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20 ${fieldErrors.currentPassword ? fieldErrorClass : ''}`}
                placeholder="••••••••"
              />
              {fieldErrors.currentPassword && <p className="text-[11px] text-rose-600">{fieldErrors.currentPassword}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">New password</label>
              <input
                type="password"
                value={form.newPassword}
                onChange={updateField('newPassword')}
                disabled={isFormDisabled}
                className={`w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20 ${fieldErrors.newPassword ? fieldErrorClass : ''}`}
                placeholder="At least 10 characters"
              />
              {fieldErrors.newPassword && <p className="text-[11px] text-rose-600">{fieldErrors.newPassword}</p>}
            </div>
            <div className="space-y-2 lg:col-span-2">
              <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Confirm new password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={updateField('confirmPassword')}
                disabled={isFormDisabled}
                className={`w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20 ${fieldErrors.confirmPassword ? fieldErrorClass : ''}`}
                placeholder="Re-enter your new password"
              />
              {fieldErrors.confirmPassword && <p className="text-[11px] text-rose-600">{fieldErrors.confirmPassword}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-[12px] text-slate-500">
              Passwords must include uppercase, lowercase, a number, and a symbol.
            </div>
            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="h-11 px-6 rounded-full bg-[#1c1c1c] text-white text-[13px] font-bold tracking-wide shadow-lg shadow-black/10 hover:bg-black/90 transition-colors disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
