import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import InstructorDashboard from './pages/instructor/InstructorDashboard'
import StudentDashboard from './pages/student/StudentDashboard'
import StudentClasses from './pages/student/StudentClasses'
import StudentClassDetail from './pages/student/StudentClassDetail'
import AdminDashboard from './pages/admin/AdminDashboard'
import NotFoundPage from './pages/NotFoundPage'

function RoleLanding() {
  const { user } = useAuth()
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }
  return <Navigate to={user?.role === 'instructor' ? '/instructor' : '/student'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="bottom-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleLanding />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AppShell>
                  <AdminDashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor"
            element={
              <ProtectedRoute role="instructor">
                <AppShell>
                  <InstructorDashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/class/:classId"
            element={
              <ProtectedRoute role="instructor">
                <AppShell>
                  <InstructorDashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute role="student">
                <AppShell>
                  <StudentDashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/classes"
            element={
              <ProtectedRoute role="student">
                <AppShell>
                  <StudentClasses />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/classes/:classId"
            element={
              <ProtectedRoute role="student">
                <AppShell>
                  <StudentClassDetail />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
