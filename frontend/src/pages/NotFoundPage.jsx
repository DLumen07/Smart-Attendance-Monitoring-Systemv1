import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you requested does not exist.</p>
      <Link to="/login" className="mt-4 inline-flex rounded-md bg-brand px-3 py-2 font-semibold text-white">
        Go to login
      </Link>
    </div>
  )
}
