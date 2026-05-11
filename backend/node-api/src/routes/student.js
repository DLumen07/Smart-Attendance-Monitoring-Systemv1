import { Router } from 'express'
import { query } from '../db/index.js'
import { requireAuth, ensureRole, assertStudentEnrolledClass } from '../middleware/auth.js'
import { config } from '../config/env.js'

const studentRouter = Router()

studentRouter.use(requireAuth, ensureRole('student'))

const handleError = (response, error) => {
  const status = error?.status || 500
  response.status(status).json({ message: error?.message || 'Internal server error' })
}

studentRouter.post('/classes/join', async (request, response) => {
  const joinCode = String(request.body?.joinCode || '').trim().toUpperCase()
  if (!joinCode) {
    return response.status(422).json({ message: 'Join code is required' })
  }

  try {
    const classResult = await query('SELECT id FROM classes WHERE join_code = $1', [joinCode])
    if (classResult.rows.length === 0) {
      return response.status(404).json({ message: 'Class not found' })
    }

    await query('INSERT INTO class_members (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
      classResult.rows[0].id,
      request.user.id,
    ])

    response.status(200).json({ message: 'Joined class successfully' })
  } catch (error) {
    handleError(response, error)
  }
})

studentRouter.get('/classes', async (request, response) => {
  try {
    const result = await query(
      `SELECT c.id, c.name, c.join_code AS "joinCode", u.name AS "instructorName"
       FROM class_members m
       JOIN classes c ON c.id = m.class_id
       JOIN users u ON u.id = c.instructor_id
       WHERE m.student_id = $1
       ORDER BY c.id DESC`,
      [request.user.id]
    )
    response.status(200).json({ classes: result.rows })
  } catch (error) {
    handleError(response, error)
  }
})

studentRouter.get('/classes/:classId', async (request, response) => {
  const classId = Number(request.params.classId)
  try {
    const cls = await assertStudentEnrolledClass(classId, request.user.id)
    const schedules = await query(
      'SELECT day_of_week AS "dayOfWeek", start_time AS "startTime", end_time AS "endTime" FROM class_schedules WHERE class_id = $1 ORDER BY id ASC',
      [classId]
    )
    cls.schedules = schedules.rows
    response.status(200).json({ class: cls })
  } catch (error) {
    handleError(response, error)
  }
})

studentRouter.get('/classes/:classId/sessions', async (request, response) => {
  const classId = Number(request.params.classId)
  try {
    const cls = await assertStudentEnrolledClass(classId, request.user.id)
    const sessions = await query(
      `SELECT s.id, s.session_name AS "sessionName", s.session_code AS "sessionCode",
              s.attendance_mode AS "attendanceMode", s.status, s.starts_at AS "startsAt", s.ends_at AS "endsAt",
              a.status AS "attendanceStatus", a.method AS "attendanceMethod", a.checked_in_at AS "checkedInAt"
       FROM sessions s
       LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = $1
       WHERE s.class_id = $2
       ORDER BY s.id DESC`,
      [request.user.id, classId]
    )

    const sanitized = sessions.rows.map((session) => ({ ...session, sessionCode: null }))
    response.status(200).json({ class: cls, sessions: sanitized })
  } catch (error) {
    handleError(response, error)
  }
})

studentRouter.post('/checkins', async (request, response) => {
  const methodName = String(request.body?.method || 'code')
  const sessionCode = String(request.body?.sessionCode || '').trim().toUpperCase()

  if (!['qr', 'code', 'manual'].includes(methodName)) {
    return response.status(422).json({ message: 'Invalid check-in method' })
  }

  if (!sessionCode && methodName !== 'manual') {
    return response.status(422).json({ message: 'Session code is required' })
  }

  try {
    let sessionResult
    if (methodName === 'manual') {
      const classId = Number(request.body?.classId || 0)
      if (classId <= 0) {
        return response.status(422).json({ message: 'Class is required for manual check-in' })
      }

      sessionResult = await query(
        `SELECT s.id, s.class_id AS "classId", s.attendance_mode AS "attendanceMode", s.starts_at AS "startsAt",
                EXTRACT(EPOCH FROM (NOW() - s.starts_at)) / 60 AS "minutesSinceStart"
         FROM sessions s
         WHERE s.class_id = $1 AND s.status = 'open'
         ORDER BY s.id DESC
         LIMIT 1`,
        [classId]
      )
    } else {
      sessionResult = await query(
        `SELECT s.id, s.class_id AS "classId", s.attendance_mode AS "attendanceMode", s.starts_at AS "startsAt",
                EXTRACT(EPOCH FROM (NOW() - s.starts_at)) / 60 AS "minutesSinceStart"
         FROM sessions s
         WHERE s.session_code = $1 AND s.status = 'open'`,
        [sessionCode]
      )
    }

    if (sessionResult.rows.length === 0) {
      return response.status(404).json({
        message: methodName === 'manual' ? 'No open session found for class' : 'Open session not found',
      })
    }

    const session = sessionResult.rows[0]
    const member = await query('SELECT id FROM class_members WHERE class_id = $1 AND student_id = $2', [
      session.classId,
      request.user.id,
    ])
    if (member.rows.length === 0) {
      return response.status(403).json({ message: 'You are not enrolled in this class' })
    }

    if (
      methodName === 'manual' &&
      session.attendanceMode !== 'manual_only' &&
      session.attendanceMode !== 'qr_or_code'
    ) {
      return response.status(403).json({ message: 'Manual attendance is not allowed for this session' })
    }

    let status = 'present'
    const minutesSinceStart = Number(session.minutesSinceStart)
    if (!Number.isNaN(minutesSinceStart)) {
      if (minutesSinceStart >= config.lateCutoffMinutes) {
        status = 'late'
      }
    } else if (session.startsAt) {
      const startTime = new Date(session.startsAt)
      const lateCutoff = new Date(startTime.getTime() + config.lateCutoffMinutes * 60000)
      if (new Date() >= lateCutoff) {
        status = 'late'
      }
    }

    await query(
      `INSERT INTO attendance (session_id, student_id, method, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id, student_id)
       DO UPDATE SET method = EXCLUDED.method, checked_in_at = NOW(), status = EXCLUDED.status`,
      [session.id, request.user.id, methodName, status]
    )

    response
      .status(200)
      .json({ message: status === 'late' ? 'Late check-in recorded' : 'Check-in recorded', status })
  } catch (error) {
    handleError(response, error)
  }
})

studentRouter.get('/attendance', async (request, response) => {
  try {
    const result = await query(
      `SELECT a.id, c.name AS "className", s.session_name AS "sessionName", s.session_code AS "sessionCode",
              s.starts_at AS "startsAt", EXTRACT(DOW FROM s.starts_at)::int AS "sessionDay",
              a.method, a.status, a.checked_in_at AS "checkedInAt"
       FROM attendance a
       JOIN sessions s ON s.id = a.session_id
       JOIN classes c ON c.id = s.class_id
       WHERE a.student_id = $1
       ORDER BY a.id DESC`,
      [request.user.id]
    )

    const records = result.rows.map((record) => ({ ...record, sessionCode: null }))
    response.status(200).json({ attendance: records })
  } catch (error) {
    handleError(response, error)
  }
})

export { studentRouter }