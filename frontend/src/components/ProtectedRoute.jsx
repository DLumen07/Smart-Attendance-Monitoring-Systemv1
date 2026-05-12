import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const roleHome = (role) => {
  if (role === 'admin') {
    return '/admin'
  }
  if (role === 'instructor') {
    return '/instructor'
  }
  return '/student'
}

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const requiredRoles = Array.isArray(role) ? role : role ? [role] : []
  if (requiredRoles.length > 0 && !requiredRoles.includes(user?.role)) {
    return <Navigate to={roleHome(user?.role)} replace />
  }

  return children
}
