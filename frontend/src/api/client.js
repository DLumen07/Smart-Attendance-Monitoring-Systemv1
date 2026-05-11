const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')

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

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch (error) {
    throw new Error('Unable to reach the API server. Please check that it is running.')
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message || 'Something went wrong')
  }

  return payload
}

export { API_BASE_URL }
