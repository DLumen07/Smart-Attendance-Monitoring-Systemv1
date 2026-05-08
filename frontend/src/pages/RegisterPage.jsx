import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'student',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate(form.role === 'instructor' ? '/instructor' : '/student')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-ink">Create account</h1>
      <p className="mt-2 text-sm text-slate-600">Use instructor or student role for access.</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium">
          Full name
          <input
            required
            type="text"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input
            required
            type="email"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            required
            minLength={6}
            type="password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium">
          Role
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
          </select>
        </label>
        {form.role === 'student' && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parent or guardian (optional)</p>
            <label className="block text-sm font-medium">
              Parent name
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.parentName}
                onChange={(event) => setForm((prev) => ({ ...prev, parentName: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium">
              Parent email
              <input
                type="email"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.parentEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, parentEmail: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium">
              Parent phone
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.parentPhone}
                onChange={(event) => setForm((prev) => ({ ...prev, parentPhone: event.target.value }))}
              />
            </label>
          </div>
        )}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" disabled={loading} className="w-full rounded-md bg-brand px-3 py-2 font-semibold text-white">
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Already have an account? <Link className="font-semibold text-brand" to="/login">Login</Link>
      </p>
    </div>
  )
}
