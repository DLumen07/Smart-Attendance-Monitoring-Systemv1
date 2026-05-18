import { createApp } from '../src/app.js'
import { config } from '../src/config/env.js'
import { ensureDatabasePatches } from '../src/db/migrate.js'
import { ensureAdminAccount } from '../src/services/admin-bootstrap.js'

if (!config.databaseUrl) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env or set it in your shell.')
  process.exit(1)
}

const suffix = Array.from({ length: 5 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('')
const instructorEmail = `smoke_instructor_${Date.now()}@example.local`
const studentEmail = `smoke_student_${Date.now()}@example.local`
const instructorName = `Smoke Instructor ${suffix}`
const studentName = `Smoke Student ${suffix}`

await ensureDatabasePatches()
await ensureAdminAccount()

const app = createApp({ allowedOrigins: [] })

const server = app.listen(0, async () => {
  const address = server.address()
  const port = typeof address === 'object' ? address.port : 0
  const baseUrl = `http://127.0.0.1:${port}`

  const requestJson = async (path, options = {}, token) => {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    })
    const payload = await response.json().catch(() => ({}))
    return { response, payload }
  }

  try {
    const instructorRegister = await requestJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: instructorName,
        email: instructorEmail,
        password: 'Instructor123!',
        role: 'instructor',
      }),
    })

    if (instructorRegister.response.status !== 201) {
      console.error('Instructor register failed:', instructorRegister.response.status, instructorRegister.payload)
      process.exit(1)
    }

    const studentRegister = await requestJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: studentName,
        email: studentEmail,
        password: 'Student123!',
        role: 'student',
        yearLevel: '1st',
        program: 'Computer Science',
        section: 'BSCS-1A',
        studentId: '12-34-5678',
      }),
    })

    if (studentRegister.response.status !== 201) {
      console.error('Student register failed:', studentRegister.response.status, studentRegister.payload)
      process.exit(1)
    }

    const instructorUserId = instructorRegister.payload?.user?.id

    const adminLogin = await requestJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: config.adminEmail, password: config.adminPassword }),
    })

    if (adminLogin.response.status !== 200 || !adminLogin.payload?.token) {
      console.error('Admin login failed:', adminLogin.response.status, adminLogin.payload)
      process.exit(1)
    }

    const approveInstructor = await requestJson(
      `/admin/instructors/${instructorUserId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ status: 'approved' }),
      },
      adminLogin.payload.token
    )

    if (approveInstructor.response.status !== 200) {
      console.error('Instructor approval failed:', approveInstructor.response.status, approveInstructor.payload)
      process.exit(1)
    }

    const instructorLogin = await requestJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: instructorEmail, password: 'Instructor123!' }),
    })

    if (instructorLogin.response.status !== 200 || !instructorLogin.payload?.token) {
      console.error('Instructor login failed:', instructorLogin.response.status, instructorLogin.payload)
      process.exit(1)
    }

    const instructorToken = instructorLogin.payload.token
    const studentToken = studentRegister.payload.token

    const classCreate = await requestJson(
      '/instructor/classes',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'Smoke Class',
          schedules: [{ dayOfWeek: 'Monday', startTime: '08:00', endTime: '09:00' }],
        }),
      },
      instructorToken
    )

    if (classCreate.response.status !== 201) {
      console.error('Create class failed:', classCreate.response.status, classCreate.payload)
      process.exit(1)
    }

    const classInfo = classCreate.payload.class

    const joinResponse = await requestJson(
      '/student/classes/join',
      {
        method: 'POST',
        body: JSON.stringify({ joinCode: classInfo.joinCode }),
      },
      studentToken
    )

    if (joinResponse.response.status !== 200) {
      console.error('Join class failed:', joinResponse.response.status, joinResponse.payload)
      process.exit(1)
    }

    const sessionCreate = await requestJson(
      `/instructor/classes/${classInfo.id}/sessions`,
      {
        method: 'POST',
        body: JSON.stringify({ sessionName: 'Smoke Session', attendanceMode: 'qr_or_code' }),
      },
      instructorToken
    )

    if (sessionCreate.response.status !== 201) {
      console.error('Create session failed:', sessionCreate.response.status, sessionCreate.payload)
      process.exit(1)
    }

    const sessionInfo = sessionCreate.payload.session

    const checkin = await requestJson(
      '/student/checkins',
      {
        method: 'POST',
        body: JSON.stringify({ sessionCode: sessionInfo.sessionCode, method: 'code' }),
      },
      studentToken
    )

    if (checkin.response.status !== 200) {
      console.error('Student check-in failed:', checkin.response.status, checkin.payload)
      process.exit(1)
    }

    const attendance = await requestJson(
      `/instructor/sessions/${sessionInfo.id}/attendance`,
      {
        method: 'GET',
      },
      instructorToken
    )

    if (attendance.response.status !== 200) {
      console.error('Attendance fetch failed:', attendance.response.status, attendance.payload)
      process.exit(1)
    }

    console.log('Class flow smoke test OK')
    process.exit(0)
  } catch (error) {
    console.error('Smoke class flow error:', error.message)
    process.exit(1)
  } finally {
    server.close()
  }
})
