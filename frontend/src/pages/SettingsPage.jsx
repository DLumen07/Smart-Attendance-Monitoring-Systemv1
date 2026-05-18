import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/AuthContext'

const emptyForm = {
  fullName: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export default function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      fullName: user?.fullName || '',
      email: user?.email || '',
    }))
  }, [user?.fullName, user?.email])

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!user) {
      return
    }

    const payload = {}
    const fullName = form.fullName.trim()
    const email = form.email.trim()

    if (fullName && fullName !== user.fullName) {
      payload.fullName = fullName
    }

    if (email && email !== user.email) {
      payload.email = email
    }

    if (form.newPassword) {
      if (!form.currentPassword) {
        toast.error('Enter your current password to set a new one.')
        return
      }
      if (form.newPassword !== form.confirmPassword) {
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

    setIsSaving(true)
    try {
      await updateProfile(payload)
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
                onChange={updateField('fullName')}
                className="w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20"
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={updateField('email')}
                className="w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Current password</label>
              <input
                type="password"
                value={form.currentPassword}
                onChange={updateField('currentPassword')}
                className="w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">New password</label>
              <input
                type="password"
                value={form.newPassword}
                onChange={updateField('newPassword')}
                className="w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20"
                placeholder="At least 10 characters"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <label className="text-[12px] font-black uppercase tracking-widest text-slate-400">Confirm new password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={updateField('confirmPassword')}
                className="w-full h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-medium text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#1c1c1c]/20"
                placeholder="Re-enter your new password"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-[12px] text-slate-500">
              Passwords must include uppercase, lowercase, a number, and a symbol.
            </div>
            <button
              type="submit"
              disabled={isSaving}
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
