import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import InstructorDashboard from './pages/instructor/InstructorDashboard'
import StudentDashboard from './pages/student/StudentDashboard'
import NotFoundPage from './pages/NotFoundPage'

function RoleLanding() {
  const { user } = useAuth()
  return <Navigate to={user?.role === 'instructor' ? '/instructor' : '/student'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleLanding />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
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
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
