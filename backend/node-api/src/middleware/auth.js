import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import { query } from '../db/index.js'

export function requireAuth(request, response, next) {
  const authHeader = request.headers.authorization || ''
  const match = authHeader.match(/Bearer\s+(.*)$/i)
  if (!match) {
    return response.status(401).json({ message: 'Missing auth token' })
  }

  try {
    const payload = jwt.verify(match[1], config.jwtSecret)
    if (!payload?.sub || !payload?.role) {
      return response.status(401).json({ message: 'Invalid auth token' })
    }
    request.user = { id: Number(payload.sub), role: String(payload.role), email: String(payload.email || '') }
    return next()
  } catch (error) {
    return response.status(401).json({ message: 'Invalid auth token' })
  }
}

export function ensureRole(requiredRole) {
  return (request, response, next) => {
    if (!request.user || request.user.role !== requiredRole) {
      return response.status(403).json({ message: 'Forbidden' })
    }
    return next()
  }
}

export async function assertInstructorOwnsClass(classId, instructorId) {
  const result = await query('SELECT id FROM classes WHERE id = $1 AND instructor_id = $2', [classId, instructorId])
  if (result.rows.length === 0) {
    const error = new Error('Class not found')
    error.status = 404
    throw error
  }
}

export async function assertInstructorOwnsSession(sessionId, instructorId) {
  const result = await query(
    'SELECT s.id FROM sessions s JOIN classes c ON c.id = s.class_id WHERE s.id = $1 AND c.instructor_id = $2',
    [sessionId, instructorId]
  )
  if (result.rows.length === 0) {
    const error = new Error('Session not found')
    error.status = 404
    throw error
  }
}

export async function assertStudentEnrolledClass(classId, studentId) {
  const result = await query(
    `SELECT c.id, c.name, c.join_code AS "joinCode", u.name AS "instructorName"
     FROM class_members m
     JOIN classes c ON c.id = m.class_id
     JOIN users u ON u.id = c.instructor_id
     WHERE m.student_id = $1 AND c.id = $2`,
    [studentId, classId]
  )

  if (result.rows.length === 0) {
    const error = new Error('Class not found')
    error.status = 404
    throw error
  }

  return result.rows[0]
}
