import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'instructor' ? '/instructor' : '/student'} replace />
  }

  return children
}
