import { query } from '../db/index.js'
import { config } from '../config/env.js'
import { buildAttendanceAlertEmail, isEmailConfigured, sendEmail } from './email.js'

const ALERT_TYPE = 'consecutive_absent_3'

const formatSessionDate = (value) => {
  if (!value) {
    return 'unknown date'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'unknown date'
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const alertAlreadySent = async (classId, sessionId, studentId, channel) => {
  const result = await query(
    'SELECT id FROM attendance_alerts WHERE class_id = $1 AND session_id = $2 AND student_id = $3 AND alert_type = $4 AND channel = $5',
    [classId, sessionId, studentId, ALERT_TYPE, channel]
  )
  return result.rows.length > 0
}

const logAttendanceAlert = async (classId, sessionId, studentId, channel, status, errorMessage) => {
  await query(
    `INSERT INTO attendance_alerts (class_id, session_id, student_id, alert_type, channel, status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (class_id, session_id, student_id, alert_type, channel)
     DO UPDATE SET status = EXCLUDED.status, error_message = EXCLUDED.error_message`,
    [classId, sessionId, studentId, ALERT_TYPE, channel, status, errorMessage]
  )
}

const attemptEmailAlert = async ({ classId, sessionId, student, className, sessionInfo }) => {
  if (await alertAlreadySent(classId, sessionId, student.id, 'email')) {
    return
  }

  const parentEmail = String(student.parentEmail || '').trim()
  if (!parentEmail) {
    await logAttendanceAlert(classId, sessionId, student.id, 'email', 'skipped', 'Missing parent email')
    return
  }

  if (!isEmailConfigured()) {
    await logAttendanceAlert(classId, sessionId, student.id, 'email', 'failed', 'Email delivery not configured')
    return
  }

  const parentName = student.parentName || 'Parent'
  const studentName = student.fullName || 'Student'
  const sessionName = sessionInfo.sessionName || 'Session'
  const sessionDate = formatSessionDate(sessionInfo.startsAt)
  const subject = `Attendance alert: 3 consecutive absences - ${className}`
  const textBody = `Hello ${parentName},\n\n` +
    `This is an attendance alert for ${studentName}.\n` +
    `They have recorded 3 consecutive absences in ${className}.\n` +
    `Most recent session: ${sessionName} on ${sessionDate}.\n\n` +
    'Next steps: Please check in with your student or contact the instructor if you have questions.\n\n' +
    'Smart Attendance Monitoring'
  const htmlBody = buildAttendanceAlertEmail(parentName, studentName, className, sessionName, sessionDate)

  try {
    await sendEmail({
      to: parentEmail,
      subject,
      html: htmlBody,
      text: textBody,
    })

    await logAttendanceAlert(classId, sessionId, student.id, 'email', 'sent', null)
  } catch (error) {
    await logAttendanceAlert(
      classId,
      sessionId,
      student.id,
      'email',
      'failed',
      error?.message || 'mail delivery failed'
    )
  }
}

export const handleConsecutiveAbsenceAlerts = async (sessionId) => {
  if (!config.attendanceEmailEnabled) {
    return
  }

  const sessionResult = await query(
    'SELECT class_id AS "classId", session_name AS "sessionName", starts_at AS "startsAt" FROM sessions WHERE id = $1',
    [sessionId]
  )

  if (sessionResult.rows.length === 0) {
    return
  }

  const sessionInfo = sessionResult.rows[0]
  const classResult = await query('SELECT name FROM classes WHERE id = $1', [sessionInfo.classId])
  const className = classResult.rows[0]?.name || 'Class'

  const studentsResult = await query(
    `SELECT u.id, u.name AS "fullName", u.parent_name AS "parentName", u.parent_email AS "parentEmail"
     FROM class_members m
     JOIN users u ON u.id = m.student_id
     WHERE m.class_id = $1`,
    [sessionInfo.classId]
  )

  for (const student of studentsResult.rows) {
    const recentResult = await query(
      `SELECT s.id, s.starts_at AS "startsAt", a.status
       FROM sessions s
       LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = $1
       WHERE s.class_id = $2 AND s.status = 'closed'
       ORDER BY s.starts_at DESC
       LIMIT 4`,
      [student.id, sessionInfo.classId]
    )

    if (recentResult.rows.length < 3) {
      continue
    }

    const lastThree = recentResult.rows.slice(0, 3)
    const allAbsent = lastThree.every((row) => (row.status || '') === 'absent')
    if (!allAbsent) {
      continue
    }

    const previous = recentResult.rows[3]
    const previouslyAbsent = (previous?.status || '') === 'absent'
    if (previouslyAbsent) {
      continue
    }

    await attemptEmailAlert({
      classId: sessionInfo.classId,
      sessionId,
      student,
      className,
      sessionInfo,
    })
  }
}
