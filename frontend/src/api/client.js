const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/Smart%20Attendance%20Monitoring/backend/api'

export async function apiRequest(path, options = {}) {
  // Using sessionStorage ensures different tabs can hold different account sessions
  const token = sessionStorage.getItem('attendance_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message || 'Something went wrong')
  }

  return payload
}

export { API_BASE_URL }
