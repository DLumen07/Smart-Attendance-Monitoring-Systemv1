import { Router } from 'express'
import { query, withTransaction } from '../db/index.js'
import {
  requireAuth,
  ensureRole,
  assertInstructorOwnsClass,
  assertInstructorOwnsSession,
} from '../middleware/auth.js'
import { makeCode } from '../utils/code.js'

const instructorRouter = Router()

instructorRouter.use(requireAuth, ensureRole('instructor'))

const handleError = (response, error) => {
  const status = error?.status || 500
  response.status(status).json({ message: error?.message || 'Internal server error' })
}

instructorRouter.get('/classes', async (request, response) => {
  try {
    const result = await query(
      `SELECT c.id, c.name, c.join_code AS "joinCode", c.created_at AS "createdAt",
              COUNT(DISTINCT m.student_id)::int AS "studentCount"
       FROM classes c
       LEFT JOIN class_members m ON c.id = m.class_id
       WHERE c.instructor_id = $1
       GROUP BY c.id
       ORDER BY c.id DESC`,
      [request.user.id]
    )

    const classes = result.rows
    if (classes.length > 0) {
      const classIds = classes.map((row) => row.id)
      const schedulesResult = await query(
        `SELECT class_id AS "classId", day_of_week AS "dayOfWeek", start_time AS "startTime", end_time AS "endTime"
         FROM class_schedules
         WHERE class_id = ANY($1::bigint[])`,
        [classIds]
      )

      const scheduleMap = new Map()
      for (const row of schedulesResult.rows) {
        if (!scheduleMap.has(row.classId)) {
          scheduleMap.set(row.classId, [])
        }
        scheduleMap.get(row.classId).push({
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
        })
      }

      for (const cls of classes) {
        cls.schedules = scheduleMap.get(cls.id) || []
      }
    }

    response.status(200).json({ classes })
  } catch (error) {
    handleError(response, error)
  }
})

instructorRouter.get('/analytics', async (request, response) => {
  try {
    const userId = request.user.id
    const totalClasses = await query('SELECT COUNT(*)::int AS count FROM classes WHERE instructor_id = $1', [userId])
    const totalSessions = await query(
      'SELECT COUNT(*)::int AS count FROM sessions s JOIN classes c ON c.id = s.class_id WHERE c.instructor_id = $1',
      [userId]
    )
    const totalStudents = await query(
      'SELECT COUNT(DISTINCT m.student_id)::int AS count FROM class_members m JOIN classes c ON c.id = m.class_id WHERE c.instructor_id = $1',
      [userId]
    )
    const attendance = await query(
      `SELECT SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END)::int AS present_count,
              COUNT(*)::int AS total_count
       FROM attendance a
       JOIN sessions s ON s.id = a.session_id
       JOIN classes c ON c.id = s.class_id
       WHERE c.instructor_id = $1`,
      [userId]
    )

    const presentCount = attendance.rows[0]?.present_count || 0
    const totalCount = attendance.rows[0]?.total_count || 0
    const attendanceRate = totalCount ? Math.round((presentCount / totalCount) * 100) : 0

    const recentSessions = await query(
      `SELECT s.id, s.session_name AS "sessionName", s.starts_at AS "startsAt", s.status,
              c.name AS "className",
              (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND a.status IN ('present', 'late')) AS attendances
       FROM sessions s
       JOIN classes c ON c.id = s.class_id
       WHERE c.instructor_id = $1
       ORDER BY s.starts_at DESC
       LIMIT 3`,
      [userId]
    )

    response.status(200).json({
      analytics: {
        totalClasses: totalClasses.rows[0]?.count || 0,
        totalStudents: totalStudents.rows[0]?.count || 0,
        totalSessions: totalSessions.rows[0]?.count || 0,
        attendanceRate,
        recentSessions: recentSessions.rows,
      },
    })
  } catch (error) {
    handleError(response, error)
  }
})

instructorRouter.post('/classes', async (request, response) => {
  const name = String(request.body?.name || '').trim()
  const schedules = Array.isArray(request.body?.schedules) ? request.body.schedules : []

  if (!name) {
    return response.status(422).json({ message: 'Class name is required' })
  }

  try {
    const joinCode = makeCode(8)
    const result = await withTransaction(async (client) => {
      const insert = await client.query(
        'INSERT INTO classes (instructor_id, name, join_code) VALUES ($1, $2, $3) RETURNING id',
        [request.user.id, name, joinCode]
      )
      const classId = insert.rows[0].id

      if (schedules.length > 0) {
        const scheduleInsert =
          'INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)'
        for (const schedule of schedules) {
          if (!schedule?.dayOfWeek || !schedule?.startTime || !schedule?.endTime) {
            continue
          }
          await client.query(scheduleInsert, [classId, String(schedule.dayOfWeek).trim(), schedule.startTime, schedule.endTime])
        }
      }

      return classId
    })

    response.status(201).json({
      class: {
        id: result,
        name,
        joinCode,
      },
    })
  } catch (error) {
    handleError(response, error)
  }
})

instructorRouter.put('/classes/:classId', async (request, response) => {
  const classId = Number(request.params.classId)
  const name = String(request.body?.name || '').trim()
  const schedules = Array.isArray(request.body?.schedules) ? request.body.schedules : []

  if (!name) {
    return response.status(422).json({ message: 'Class name is required' })
  }

  try {
    await assertInstructorOwnsClass(classId, request.user.id)
    await withTransaction(async (client) => {
      await client.query('UPDATE classes SET name = $1 WHERE id = $2', [name, classId])
      await client.query('DELETE FROM class_schedules WHERE class_id = $1', [classId])

      if (schedules.length > 0) {
        const scheduleInsert =
          'INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)'
        for (const schedule of schedules) {
          if (!schedule?.dayOfWeek || !schedule?.startTime || !schedule?.endTime) {
            continue
          }
          await client.query(scheduleInsert, [classId, String(schedule.dayOfWeek).trim(), schedule.startTime, schedule.endTime])
        }
      }
    })

    response.status(200).json({ message: 'Class updated successfully' })
  } catch (error) {
    handleError(response, error)
  }
})

instructorRouter.post('/classes/:classId/sessions', async (request, response) => {
  const classId = Number(request.params.classId)
  const sessionName = String(request.body?.sessionName || '').trim()
  const attendanceMode = String(request.body?.attendanceMode || 'qr_or_code')

  if (!sessionName) {
    return response.status(422).json({ message: 'Session name is required' })
  }
  if (!['qr_or_code', 'manual_only'].includes(attendanceMode)) {
    return response.status(422).json({ message: 'Invalid attendance mode' })
  }

  try {
    await assertInstructorOwnsClass(classId, request.user.id)
    const sessionCode = makeCode(6)
    const session = await withTransaction(async (client) => {
      const insert = await client.query(
        `INSERT INTO sessions (class_id, session_name, session_code, attendance_mode, status, starts_at)
         VALUES ($1, $2, $3, $4, 'open', NOW())
         RETURNING id, class_id AS "classId", session_name AS "sessionName", session_code AS "sessionCode",
                   attendance_mode AS "attendanceMode", status`,
        [classId, sessionName, sessionCode, attendanceMode]
      )

      await client.query(
        `INSERT INTO attendance (session_id, student_id, method, status)
         SELECT $1, student_id, 'manual', 'absent'
         FROM class_members
         WHERE class_id = $2
         ON CONFLICT (session_id, student_id) DO NOTHING`,
        [insert.rows[0].id, classId]
      )

      return insert.rows[0]
    })

    response.status(201).json({ session })
  } catch (error) {
    handleError(response, error)
  }
})

instructorRouter.get('/classes/:classId/sessions', async (request, response) => {
  const classId = Number(request.params.classId)
  try {
    await assertInstructorOwnsClass(classId, request.user.id)
    const result = await query(
      `SELECT id, class_id AS "classId", session_name AS "sessionName", session_code AS "sessionCode",
              attendance_mode AS "attendanceMode", status, starts_at AS "startsAt", ends_at AS "endsAt"
       FROM sessions
       WHERE class_id = $1
       ORDER BY id DESC`,
      [classId]
    )
    response.status(200).json({ sessions: result.rows })
  } catch (error) {
    handleError(response, error)
  }
})

instructorRouter.get('/classes/:classId/students', async (request, response) => {
  const classId = Number(request.params.classId)
  try {
    await assertInstructorOwnsClass(classId, request.user.id)
    const result = await query(
      `SELECT u.id, u.name AS "fullName", u.email, cm.joined_at AS "joinedAt"
       FROM class_members cm
       JOIN users u ON u.id = cm.student_id
       WHERE cm.class_id = $1
       ORDER BY u.name ASC`,
      [classId]
    )
    response.status(200).json({ students: result.rows })
  } catch (error) {
    handleError(response, error)
  }
})

instructorRouter.patch('/sessions/:sessionId/status', async (request, response) => {
  const sessionId = Number(request.params.sessionId)
  const status = String(request.body?.status || '')

  if (!['open', 'closed'].includes(status)) {
    return response.status(422).json({ message: 'Invalid status' })
  }

  try {
    await assertInstructorOwnsSession(sessionId, request.user.id)
    await query(
      'UPDATE sessions SET status = $1, ends_at = CASE WHEN $1 = $2 THEN NOW() ELSE NULL END WHERE id = $3',
      [status, 'closed', sessionId]
    )

    response.status(200).json({ message: 'Session updated' })
  } catch (error) {
    handleError(response, error)
  }
})

instructorRouter.get('/sessions/:sessionId/attendance', async (request, response) => {
  const sessionId = Number(request.params.sessionId)
  try {
    await assertInstructorOwnsSession(sessionId, request.user.id)
    const sessionResult = await query('SELECT class_id FROM sessions WHERE id = $1', [sessionId])
    const classId = sessionResult.rows[0]?.class_id

    if (classId) {
      await query(
        `INSERT INTO attendance (session_id, student_id, method, status)
         SELECT $1, student_id, 'manual', 'absent'
         FROM class_members
         WHERE class_id = $2
         ON CONFLICT (session_id, student_id) DO NOTHING`,
        [sessionId, classId]
      )
    }

    const attendance = await query(
      `SELECT a.id, a.method, a.status, a.checked_in_at AS "checkedInAt",
              u.name AS "studentName", u.email AS "studentEmail"
       FROM attendance a
       JOIN users u ON u.id = a.student_id
       WHERE a.session_id = $1
       ORDER BY u.name ASC`,
      [sessionId]
    )

    response.status(200).json({ attendance: attendance.rows })
  } catch (error) {
    handleError(response, error)
  }
})

instructorRouter.patch('/attendance/:attendanceId', async (request, response) => {
  const attendanceId = Number(request.params.attendanceId)
  const status = String(request.body?.status || '')

  if (!['present', 'late', 'absent'].includes(status)) {
    return response.status(422).json({ message: 'Status must be present, late, or absent' })
  }

  try {
    const sessionResult = await query('SELECT session_id FROM attendance WHERE id = $1', [attendanceId])
    if (sessionResult.rows.length === 0) {
      return response.status(404).json({ message: 'Attendance not found' })
    }

    await assertInstructorOwnsSession(Number(sessionResult.rows[0].session_id), request.user.id)
    await query(
      'UPDATE attendance SET status = $1, reviewed_at = NOW(), reviewed_by = $2 WHERE id = $3',
      [status, request.user.id, attendanceId]
    )

    response.status(200).json({ message: 'Attendance reviewed' })
  } catch (error) {
    handleError(response, error)
  }
})

export { instructorRouter }