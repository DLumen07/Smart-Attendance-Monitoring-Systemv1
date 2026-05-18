import { Router } from 'express'
import { query, withTransaction } from '../db/index.js'
import { requireAuth, ensureRole } from '../middleware/auth.js'
import { logActivity, requestMeta } from '../services/activity-log.js'

const adminRouter = Router()

adminRouter.use(requireAuth, ensureRole('admin'))

const handleError = (response, error) => {
  const status = error?.status || 500
  response.status(status).json({ message: error?.message || 'Internal server error' })
}

adminRouter.get('/pending-instructors', async (_request, response) => {
  try {
    const result = await query(
      `SELECT id, name AS "fullName", email, approval_status AS "approvalStatus", created_at AS "createdAt"
       FROM users
       WHERE role = 'instructor' AND approval_status = 'pending'
       ORDER BY created_at ASC`
    )
    response.status(200).json({ users: result.rows })
  } catch (error) {
    handleError(response, error)
  }
})

adminRouter.post('/instructors/:userId/approve', async (request, response) => {
  const userId = Number(request.params.userId)
  const nextStatus = String(request.body?.status || 'approved').trim().toLowerCase()
  if (!Number.isFinite(userId) || userId <= 0) {
    return response.status(422).json({ message: 'Invalid user id' })
  }
  if (!['approved', 'rejected'].includes(nextStatus)) {
    return response.status(422).json({ message: 'Invalid status. Use approved or rejected.' })
  }

  try {
    const result = await query(
      `UPDATE users
       SET approval_status = $1
       WHERE id = $2 AND role = 'instructor'
       RETURNING id, name AS "fullName", email, approval_status AS "approvalStatus"`,
      [nextStatus, userId]
    )

    if (result.rows.length === 0) {
      return response.status(404).json({ message: 'Instructor account not found' })
    }

    const meta = requestMeta(request)
    await logActivity({
      actorUserId: request.user.id,
      action: `admin.instructor_${nextStatus}`,
      targetType: 'user',
      targetId: String(userId),
      details: { approvalStatus: nextStatus },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => {})

    response.status(200).json({ user: result.rows[0] })
  } catch (error) {
    handleError(response, error)
  }
})

adminRouter.get('/activity-logs', async (request, response) => {
  const requestedLimit = Number(request.query?.limit || 150)
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(500, requestedLimit)) : 150

  try {
    const result = await query(
      `SELECT l.id,
              l.action,
              l.target_type AS "targetType",
              l.target_id AS "targetId",
              l.details,
              l.ip_address AS "ipAddress",
              l.user_agent AS "userAgent",
              l.created_at AS "createdAt",
              u.name AS "actorName",
              u.email AS "actorEmail"
       FROM activity_logs l
       LEFT JOIN users u ON u.id = l.actor_user_id
       ORDER BY l.id DESC
       LIMIT $1`,
      [limit]
    )

    response.status(200).json({ logs: result.rows })
  } catch (error) {
    handleError(response, error)
  }
})

adminRouter.get('/analytics', async (_request, response) => {
  try {
    const [usersCount, pendingInstructors, totalClasses, totalSessions, activeSessions, attendanceStats] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE role = 'student')::int AS students,
                COUNT(*) FILTER (WHERE role = 'instructor')::int AS instructors,
                COUNT(*) FILTER (WHERE role = 'admin')::int AS admins
         FROM users`
      ),
      query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'instructor' AND approval_status = 'pending'`),
      query(`SELECT COUNT(*)::int AS count FROM classes`),
      query(`SELECT COUNT(*)::int AS count FROM sessions`),
      query(`SELECT COUNT(*)::int AS count FROM sessions WHERE status = 'open'`),
      query(
        `SELECT COUNT(*)::int AS total,
                SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END)::int AS attended
         FROM attendance`
      ),
    ])

    const totalAttendance = attendanceStats.rows[0]?.total || 0
    const attended = attendanceStats.rows[0]?.attended || 0
    const attendanceRate = totalAttendance ? Math.round((attended / totalAttendance) * 100) : 0

    response.status(200).json({
      analytics: {
        users: usersCount.rows[0] || { total: 0, students: 0, instructors: 0, admins: 0 },
        pendingInstructorApprovals: pendingInstructors.rows[0]?.count || 0,
        totalClasses: totalClasses.rows[0]?.count || 0,
        totalSessions: totalSessions.rows[0]?.count || 0,
        activeSessions: activeSessions.rows[0]?.count || 0,
        attendanceRate,
      },
    })
  } catch (error) {
    handleError(response, error)
  }
})

adminRouter.get('/backup', async (request, response) => {
  try {
    const [users, classes, schedules, members, sessions, attendance, alerts] = await Promise.all([
      query(
        `SELECT id,
          name,
          email,
          password,
          role,
          approval_status AS "approvalStatus",
          parent_name AS "parentName",
          parent_email AS "parentEmail",
          parent_phone AS "parentPhone",
          year_level AS "yearLevel",
          program AS "program",
          section AS "section",
          student_id AS "studentId",
          reset_code AS "resetCode",
          reset_code_expires_at AS "resetCodeExpiresAt",
          created_at AS "createdAt"
         FROM users
         ORDER BY id ASC`
      ),
      query(`SELECT id, instructor_id AS "instructorId", name, join_code AS "joinCode", created_at AS "createdAt" FROM classes ORDER BY id ASC`),
      query(`SELECT id, class_id AS "classId", day_of_week AS "dayOfWeek", start_time AS "startTime", end_time AS "endTime" FROM class_schedules ORDER BY id ASC`),
      query(`SELECT id, class_id AS "classId", student_id AS "studentId", joined_at AS "joinedAt" FROM class_members ORDER BY id ASC`),
      query(`SELECT id, class_id AS "classId", session_name AS "sessionName", session_code AS "sessionCode", attendance_mode AS "attendanceMode", status, starts_at AS "startsAt", ends_at AS "endsAt", created_at AS "createdAt" FROM sessions ORDER BY id ASC`),
      query(`SELECT id, session_id AS "sessionId", student_id AS "studentId", method, status, checked_in_at AS "checkedInAt", reviewed_at AS "reviewedAt", reviewed_by AS "reviewedBy" FROM attendance ORDER BY id ASC`),
      query(`SELECT id, class_id AS "classId", session_id AS "sessionId", student_id AS "studentId", alert_type AS "alertType", channel, status, error_message AS "errorMessage", sent_at AS "sentAt" FROM attendance_alerts ORDER BY id ASC`),
    ])

    const meta = requestMeta(request)
    await logActivity({
      actorUserId: request.user.id,
      action: 'admin.backup_exported',
      targetType: 'system',
      targetId: 'backup',
      details: {
        users: users.rows.length,
        classes: classes.rows.length,
        sessions: sessions.rows.length,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => {})

    response.status(200).json({
      backup: {
        version: '2026-05-12-admin-v1',
        generatedAt: new Date().toISOString(),
        data: {
          users: users.rows,
          classes: classes.rows,
          classSchedules: schedules.rows,
          classMembers: members.rows,
          sessions: sessions.rows,
          attendance: attendance.rows,
          attendanceAlerts: alerts.rows,
        },
      },
    })
  } catch (error) {
    handleError(response, error)
  }
})

adminRouter.post('/restore', async (request, response) => {
  const backup = request.body?.backup
  const data = backup?.data

  if (!data || typeof data !== 'object') {
    return response.status(422).json({ message: 'Backup payload is required.' })
  }

  const users = Array.isArray(data.users) ? data.users : []
  const classes = Array.isArray(data.classes) ? data.classes : []
  const classSchedules = Array.isArray(data.classSchedules) ? data.classSchedules : []
  const classMembers = Array.isArray(data.classMembers) ? data.classMembers : []
  const sessions = Array.isArray(data.sessions) ? data.sessions : []
  const attendance = Array.isArray(data.attendance) ? data.attendance : []
  const attendanceAlerts = Array.isArray(data.attendanceAlerts) ? data.attendanceAlerts : []

  try {
    await withTransaction(async (client) => {
      for (const row of users) {
        await client.query(
          `INSERT INTO users (id, name, email, password, role, approval_status, parent_name, parent_email, parent_phone, year_level, program, section, student_id, reset_code, reset_code_expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, COALESCE($16::timestamptz, NOW()))
           ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name,
               email = EXCLUDED.email,
               password = EXCLUDED.password,
               role = EXCLUDED.role,
               approval_status = EXCLUDED.approval_status,
               parent_name = EXCLUDED.parent_name,
               parent_email = EXCLUDED.parent_email,
               parent_phone = EXCLUDED.parent_phone,
               year_level = EXCLUDED.year_level,
               program = EXCLUDED.program,
               section = EXCLUDED.section,
               student_id = EXCLUDED.student_id,
               reset_code = EXCLUDED.reset_code,
               reset_code_expires_at = EXCLUDED.reset_code_expires_at`,
          [
            row.id,
            row.name,
            row.email,
            row.password,
            row.role,
            row.approvalStatus || 'approved',
            row.parentName || null,
            row.parentEmail || null,
            row.parentPhone || null,
            row.yearLevel || null,
            row.program || null,
            row.section || null,
            row.studentId || null,
            row.resetCode || null,
            row.resetCodeExpiresAt || null,
            row.createdAt || null,
          ]
        )
      }

      for (const row of classes) {
        await client.query(
          `INSERT INTO classes (id, instructor_id, name, join_code, created_at)
           VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))
           ON CONFLICT (id) DO UPDATE
           SET instructor_id = EXCLUDED.instructor_id,
               name = EXCLUDED.name,
               join_code = EXCLUDED.join_code`,
          [row.id, row.instructorId, row.name, row.joinCode, row.createdAt || null]
        )
      }

      for (const row of sessions) {
        await client.query(
          `INSERT INTO sessions (id, class_id, session_name, session_code, attendance_mode, status, starts_at, ends_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()), $8::timestamptz, COALESCE($9::timestamptz, NOW()))
           ON CONFLICT (id) DO UPDATE
           SET class_id = EXCLUDED.class_id,
               session_name = EXCLUDED.session_name,
               session_code = EXCLUDED.session_code,
               attendance_mode = EXCLUDED.attendance_mode,
               status = EXCLUDED.status,
               starts_at = EXCLUDED.starts_at,
               ends_at = EXCLUDED.ends_at`,
          [
            row.id,
            row.classId,
            row.sessionName,
            row.sessionCode,
            row.attendanceMode || 'qr_or_code',
            row.status || 'closed',
            row.startsAt || null,
            row.endsAt || null,
            row.createdAt || null,
          ]
        )
      }

      for (const row of classSchedules) {
        await client.query(
          `INSERT INTO class_schedules (id, class_id, day_of_week, start_time, end_time)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE
           SET class_id = EXCLUDED.class_id,
               day_of_week = EXCLUDED.day_of_week,
               start_time = EXCLUDED.start_time,
               end_time = EXCLUDED.end_time`,
          [row.id, row.classId, row.dayOfWeek, row.startTime, row.endTime]
        )
      }

      for (const row of classMembers) {
        await client.query(
          `INSERT INTO class_members (id, class_id, student_id, joined_at)
           VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()))
           ON CONFLICT (id) DO UPDATE
           SET class_id = EXCLUDED.class_id,
               student_id = EXCLUDED.student_id,
               joined_at = EXCLUDED.joined_at`,
          [row.id, row.classId, row.studentId, row.joinedAt || null]
        )
      }

      for (const row of attendance) {
        await client.query(
          `INSERT INTO attendance (id, session_id, student_id, method, status, checked_in_at, reviewed_at, reviewed_by)
           VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW()), $7::timestamptz, $8)
           ON CONFLICT (id) DO UPDATE
           SET session_id = EXCLUDED.session_id,
               student_id = EXCLUDED.student_id,
               method = EXCLUDED.method,
               status = EXCLUDED.status,
               checked_in_at = EXCLUDED.checked_in_at,
               reviewed_at = EXCLUDED.reviewed_at,
               reviewed_by = EXCLUDED.reviewed_by`,
          [
            row.id,
            row.sessionId,
            row.studentId,
            row.method || 'manual',
            row.status || 'pending',
            row.checkedInAt || null,
            row.reviewedAt || null,
            row.reviewedBy || null,
          ]
        )
      }

      for (const row of attendanceAlerts) {
        await client.query(
          `INSERT INTO attendance_alerts (id, class_id, session_id, student_id, alert_type, channel, status, error_message, sent_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::timestamptz, NOW()))
           ON CONFLICT (id) DO UPDATE
           SET class_id = EXCLUDED.class_id,
               session_id = EXCLUDED.session_id,
               student_id = EXCLUDED.student_id,
               alert_type = EXCLUDED.alert_type,
               channel = EXCLUDED.channel,
               status = EXCLUDED.status,
               error_message = EXCLUDED.error_message,
               sent_at = EXCLUDED.sent_at`,
          [
            row.id,
            row.classId,
            row.sessionId,
            row.studentId,
            row.alertType || 'consecutive_absent_3',
            row.channel || 'email',
            row.status || 'sent',
            row.errorMessage || null,
            row.sentAt || null,
          ]
        )
      }
    })

    const meta = requestMeta(request)
    await logActivity({
      actorUserId: request.user.id,
      action: 'admin.backup_restored',
      targetType: 'system',
      targetId: 'restore',
      details: {
        users: users.length,
        classes: classes.length,
        sessions: sessions.length,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => {})

    response.status(200).json({
      message: 'Restore completed successfully.',
      restored: {
        users: users.length,
        classes: classes.length,
        sessions: sessions.length,
      },
    })
  } catch (error) {
    handleError(response, error)
  }
})

export { adminRouter }
