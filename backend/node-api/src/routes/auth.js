import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db/index.js'
import { config } from '../config/env.js'
import { buildResetEmail, isEmailConfigured, sendEmail } from '../services/email.js'
import { logActivity, requestMeta } from '../services/activity-log.js'
import { requireAuth } from '../middleware/auth.js'

const authRouter = Router()
const authRateLimits = new Map()

const createRateLimiter = ({ keyPrefix, windowMs, max }) => (request, response, next) => {
  const key = `${keyPrefix}:${request.ip || request.socket?.remoteAddress || 'unknown'}`
  const now = Date.now()
  const attempts = authRateLimits.get(key) || []
  const recentAttempts = attempts.filter((timestamp) => now - timestamp < windowMs)

  if (recentAttempts.length >= max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - recentAttempts[0])) / 1000))
    response.set('Retry-After', String(retryAfterSeconds))
    return response.status(429).json({ message: 'Too many attempts. Please try again later.' })
  }

  recentAttempts.push(now)
  authRateLimits.set(key, recentAttempts)
  return next()
}

const registerRateLimit = createRateLimiter({ keyPrefix: 'register', windowMs: 15 * 60 * 1000, max: 5 })
const loginRateLimit = createRateLimiter({ keyPrefix: 'login', windowMs: 15 * 60 * 1000, max: 10 })
const passwordResetRateLimit = createRateLimiter({ keyPrefix: 'password-reset', windowMs: 15 * 60 * 1000, max: 5 })

const stripControlChars = (value) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, '')
const normalizeWhitespace = (value) => stripControlChars(value).replace(/\s+/g, ' ').trim()
const normalizeEmailValue = (value) => stripControlChars(value).replace(/\s+/g, '').trim().toLowerCase()
const sanitizePassword = (value) => stripControlChars(value)

const registerSchema = z.object({
  fullName: z.string().max(120).optional().default(''),
  firstName: z.string().max(40).optional().default(''),
  middleName: z.string().max(40).optional().default(''),
  lastName: z.string().max(40).optional().default(''),
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
  confirmPassword: z.string().max(128).optional().default(''),
  role: z.enum(['student', 'instructor']),
  parentName: z.string().max(120).optional().default(''),
  parentEmail: z.string().max(254).optional().default(''),
  parentPhone: z.string().max(24).optional().default(''),
  yearLevel: z.string().max(10).optional().default(''),
  program: z.string().max(80).optional().default(''),
  section: z.string().max(80).optional().default(''),
  studentId: z.string().max(20).optional().default(''),
})

const loginSchema = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
})

const updateProfileSchema = z.object({
  fullName: z.string().max(120).optional(),
  email: z.string().max(254).optional(),
  currentPassword: z.string().max(128).optional(),
  newPassword: z.string().max(128).optional(),
  parentName: z.string().max(120).optional(),
  parentEmail: z.string().max(254).optional(),
  parentPhone: z.string().max(24).optional(),
  yearLevel: z.string().max(10).optional(),
  program: z.string().max(80).optional(),
  section: z.string().max(80).optional(),
  studentId: z.string().max(20).optional(),
})

const normalizeName = (value) => normalizeWhitespace(value)
const normalizeNamePart = (value) => normalizeWhitespace(value).replace(/[^A-Za-z'\- ]+/g, '')
const sanitizePhone = (value) => stripControlChars(value).replace(/[^\d+\-()\s]/g, '').trim()
const normalizeSection = (value) => normalizeWhitespace(value).replace(/[^A-Za-z0-9\- ]+/g, '')
const sanitizeStudentId = (value) => stripControlChars(value).replace(/[^\d-]/g, '').trim()

const YEAR_LEVEL_OPTIONS = ['1st', '2nd', '3rd', '4th']
const PROGRAM_OPTIONS = [
  'Computer Science',
  'Information Technology',
  'Information Systems',
  'Software Engineering',
  'Computer Engineering',
  'Data Science',
  'Cybersecurity',
  'Business Administration',
  'Education',
  'Nursing',
]
const YEAR_LEVEL_SET = new Set(YEAR_LEVEL_OPTIONS)
const PROGRAM_SET = new Set(PROGRAM_OPTIONS)

const isValidNamePart = (value) => {
  if (!value) return false
  if (value.length > 40) return false
  return /^[A-Za-z][A-Za-z'\- ]*$/.test(value)
}

const isValidFullName = (value, requireTwoParts = false) => {
  if (!value) return false
  if (value.length > 120) return false
  if (!/^[A-Za-z][A-Za-z'\- ]+$/.test(value)) return false
  if (requireTwoParts) {
    const parts = value.split(' ').filter(Boolean)
    if (parts.length < 2) return false
  }
  return true
}

const isValidEmailAddress = (value) => {
  if (!value || value.length > 190) return false
  if (!/[A-Za-z]/.test(value)) return false
  return z.string().email().safeParse(value).success
}

const isValidYearLevel = (value) => YEAR_LEVEL_SET.has(value)

const isValidProgram = (value) => PROGRAM_SET.has(value)

const isValidSection = (value) => {
  if (!value) return false
  if (value.length > 80) return false
  return /^[A-Za-z0-9][A-Za-z0-9\- ]*$/.test(value)
}

const isValidStudentId = (value) => /^\d{2}-\d{2}-\d{4}$/.test(value)

const isStrongPassword = (value) => {
  if (!value || value.length < 10 || value.length > 128) return false
  return /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)
}

authRouter.post('/register', registerRateLimit, async (request, response) => {
  try {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return response.status(422).json({ message: 'Invalid registration payload' })
    }

    const body = parsed.data
    const firstName = normalizeNamePart(body.firstName)
    const middleName = normalizeNamePart(body.middleName)
    const lastName = normalizeNamePart(body.lastName)
    const legacyFullName = normalizeName(body.fullName)
    const email = normalizeEmailValue(body.email)
    const password = sanitizePassword(body.password)
    const confirmPassword = sanitizePassword(body.confirmPassword)
    const role = body.role
    const approvalStatus = role === 'instructor' ? 'pending' : 'approved'
    let parentName = normalizeName(body.parentName)
    let parentEmail = normalizeEmailValue(body.parentEmail)
    let parentPhone = sanitizePhone(body.parentPhone)
    let yearLevel = normalizeWhitespace(body.yearLevel)
    let program = normalizeWhitespace(body.program)
    let section = normalizeSection(body.section)
    let studentId = sanitizeStudentId(body.studentId)

    let fullName = ''
    if (firstName || middleName || lastName) {
      if (!isValidNamePart(firstName)) {
        return response.status(422).json({
          message: 'First name is invalid. Use letters, spaces, apostrophes, or hyphens only.',
        })
      }

      if (!isValidNamePart(lastName)) {
        return response.status(422).json({
          message: 'Last name is invalid. Use letters, spaces, apostrophes, or hyphens only.',
        })
      }

      if (middleName && !isValidNamePart(middleName)) {
        return response.status(422).json({
          message: 'Middle name is invalid. Use letters, spaces, apostrophes, or hyphens only.',
        })
      }

      fullName = normalizeName([firstName, middleName, lastName].filter(Boolean).join(' '))
    } else {
      fullName = legacyFullName
    }

    if (!fullName || !email || !password || !['student', 'instructor'].includes(role)) {
      return response.status(422).json({ message: 'Invalid registration payload' })
    }

    if (!isValidFullName(fullName, true)) {
      return response.status(422).json({
        message: 'Full name must include at least first and last name and only letters, spaces, apostrophes, or hyphens.',
      })
    }

    if (!isValidEmailAddress(email)) {
      return response.status(422).json({ message: 'Invalid email address.' })
    }

    if (!isStrongPassword(password)) {
      return response.status(422).json({
        message: 'Password must be at least 10 characters and include uppercase, lowercase, a number, and a symbol.',
      })
    }

    if (confirmPassword && password !== confirmPassword) {
      return response.status(422).json({ message: 'Password and confirm password do not match.' })
    }

    if (role === 'student') {
      if (!isValidYearLevel(yearLevel)) {
        return response.status(422).json({ message: 'Year level is required.' })
      }

      if (!isValidProgram(program)) {
        return response.status(422).json({ message: 'Program/department is required.' })
      }

      if (!isValidSection(section)) {
        return response.status(422).json({ message: 'Section/class group is required.' })
      }

      if (!isValidStudentId(studentId)) {
        return response.status(422).json({ message: 'Student ID must match 00-00-0000.' })
      }
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return response.status(409).json({ message: 'Email already registered' })
    }

    const existingName = await query('SELECT id FROM users WHERE LOWER(name) = LOWER($1)', [fullName])
    if (existingName.rows.length > 0) {
      return response.status(409).json({ message: 'Full name already registered' })
    }

    if (role !== 'student') {
      parentName = ''
      parentEmail = ''
      parentPhone = ''
      yearLevel = ''
      program = ''
      section = ''
      studentId = ''
    }

    if (parentName && !isValidFullName(parentName, true)) {
      return response.status(422).json({
        message: 'Parent name must include first and last name and only letters, spaces, apostrophes, or hyphens.',
      })
    }

    if (parentEmail && !isValidEmailAddress(parentEmail)) {
      return response.status(422).json({ message: 'Parent email address is invalid.' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const result = await query(
      'INSERT INTO users (name, email, password, role, approval_status, parent_name, parent_email, parent_phone, year_level, program, section, student_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, name, email, role, approval_status AS "approvalStatus"',
      [
        fullName,
        email,
        hashed,
        role,
        approvalStatus,
        parentName || null,
        parentEmail || null,
        parentPhone || null,
        yearLevel || null,
        program || null,
        section || null,
        studentId || null,
      ]
    )

    const user = result.rows[0]
    const meta = requestMeta(request)
    await logActivity({
      actorUserId: user.id,
      action: role === 'instructor' ? 'auth.register_instructor_pending' : 'auth.register_success',
      targetType: 'user',
      targetId: String(user.id),
      details: { role: user.role, approvalStatus: user.approvalStatus },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => {})

    if (role === 'instructor') {
      return response.status(201).json({
        message: 'Instructor registration submitted. Please wait for admin approval before logging in.',
        user: {
          id: user.id,
          fullName: user.name,
          email: user.email,
          role: user.role,
          approvalStatus: user.approvalStatus,
        },
      })
    }

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwtSecret, {
      expiresIn: '7d',
    })

    response.status(201).json({
      token,
      user: {
        id: user.id,
        fullName: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    })
  } catch (error) {
    console.error(error)
    response.status(500).json({ message: 'Internal server error' })
  }
})

authRouter.post('/login', loginRateLimit, async (request, response) => {
  try {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return response.status(422).json({ message: 'Email and password are required' })
    }

    const body = parsed.data
    const email = normalizeEmailValue(body.email)
    const password = sanitizePassword(body.password)

    if (!email || !password) {
      return response.status(422).json({ message: 'Email and password are required' })
    }

    if (!isValidEmailAddress(email)) {
      return response.status(422).json({ message: 'Email address is invalid.' })
    }

    const result = await query('SELECT id, name, email, password, role, approval_status AS "approvalStatus" FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) {
      return response.status(401).json({ message: 'Invalid credentials' })
    }

    const user = result.rows[0]
    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return response.status(401).json({ message: 'Invalid credentials' })
    }

    if (user.role === 'instructor' && user.approvalStatus !== 'approved') {
      return response.status(403).json({ message: 'Instructor account is pending admin approval.' })
    }

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwtSecret, {
      expiresIn: '7d',
    })

    const meta = requestMeta(request)
    await logActivity({
      actorUserId: user.id,
      action: 'auth.login_success',
      targetType: 'user',
      targetId: String(user.id),
      details: { role: user.role },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => {})

    response.status(200).json({
      token,
      user: {
        id: user.id,
        fullName: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    })
  } catch (error) {
    console.error(error)
    response.status(500).json({ message: 'Internal server error' })
  }
})

authRouter.get('/me', requireAuth, async (request, response) => {
  try {
    const result = await query(
      `SELECT id,
              name AS "fullName",
              email,
              role,
              approval_status AS "approvalStatus",
              parent_name AS "parentName",
              parent_email AS "parentEmail",
              parent_phone AS "parentPhone",
              year_level AS "yearLevel",
              program,
              section,
              student_id AS "studentId"
       FROM users
       WHERE id = $1`,
      [request.user.id]
    )

    if (result.rows.length === 0) {
      return response.status(404).json({ message: 'User not found' })
    }

    response.status(200).json({ user: result.rows[0] })
  } catch (error) {
    console.error(error)
    response.status(500).json({ message: 'Internal server error' })
  }
})

authRouter.put('/me', requireAuth, async (request, response) => {
  try {
    const parsed = updateProfileSchema.safeParse(request.body)
    if (!parsed.success) {
      return response.status(422).json({ message: 'Invalid profile payload' })
    }

    const payload = parsed.data
    const nextFullName = payload.fullName ? normalizeName(payload.fullName) : null
    const nextEmail = payload.email ? normalizeEmailValue(payload.email) : null
    const currentPassword = payload.currentPassword ? sanitizePassword(payload.currentPassword) : ''
    const newPassword = payload.newPassword ? sanitizePassword(payload.newPassword) : ''
    const hasStudentPayload =
      payload.parentName !== undefined
      || payload.parentEmail !== undefined
      || payload.parentPhone !== undefined
      || payload.yearLevel !== undefined
      || payload.program !== undefined
      || payload.section !== undefined
      || payload.studentId !== undefined
    const nextParentName = payload.parentName !== undefined ? normalizeName(payload.parentName) : null
    const nextParentEmail = payload.parentEmail !== undefined ? normalizeEmailValue(payload.parentEmail) : null
    const nextParentPhone = payload.parentPhone !== undefined ? sanitizePhone(payload.parentPhone) : null
    const nextYearLevel = payload.yearLevel !== undefined ? normalizeWhitespace(payload.yearLevel) : null
    const nextProgram = payload.program !== undefined ? normalizeWhitespace(payload.program) : null
    const nextSection = payload.section !== undefined ? normalizeSection(payload.section) : null
    const nextStudentId = payload.studentId !== undefined ? sanitizeStudentId(payload.studentId) : null

    if (!nextFullName && !nextEmail && !newPassword && !hasStudentPayload) {
      return response.status(422).json({ message: 'No changes submitted' })
    }

    if (nextFullName && !isValidFullName(nextFullName, true)) {
      return response.status(422).json({
        message: 'Full name must include at least first and last name and only letters, spaces, apostrophes, or hyphens.',
      })
    }

    if (nextEmail && !isValidEmailAddress(nextEmail)) {
      return response.status(422).json({ message: 'Invalid email address.' })
    }

    if (newPassword && !isStrongPassword(newPassword)) {
      return response.status(422).json({
        message: 'Password must be at least 10 characters and include uppercase, lowercase, a number, and a symbol.',
      })
    }

    if (newPassword && !currentPassword) {
      return response.status(422).json({ message: 'Current password is required to set a new password.' })
    }

    const existing = await query(
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
              program,
              section,
              student_id AS "studentId"
       FROM users
       WHERE id = $1`,
      [request.user.id]
    )

    if (existing.rows.length === 0) {
      return response.status(404).json({ message: 'User not found' })
    }

    const currentUser = existing.rows[0]

    if (hasStudentPayload && currentUser.role !== 'student') {
      return response.status(403).json({ message: 'Student details can only be updated by student accounts.' })
    }

    if (payload.parentName !== undefined && nextParentName && !isValidFullName(nextParentName, true)) {
      return response.status(422).json({
        message: 'Parent name must include first and last name and only letters, spaces, apostrophes, or hyphens.',
      })
    }

    if (payload.parentEmail !== undefined && nextParentEmail && !isValidEmailAddress(nextParentEmail)) {
      return response.status(422).json({ message: 'Parent email address is invalid.' })
    }

    if (payload.yearLevel !== undefined && !isValidYearLevel(nextYearLevel)) {
      return response.status(422).json({ message: 'Year level is required.' })
    }

    if (payload.program !== undefined && !isValidProgram(nextProgram)) {
      return response.status(422).json({ message: 'Program/department is required.' })
    }

    if (payload.section !== undefined && !isValidSection(nextSection)) {
      return response.status(422).json({ message: 'Section/class group is required.' })
    }

    if (payload.studentId !== undefined && !isValidStudentId(nextStudentId)) {
      return response.status(422).json({ message: 'Student ID must match 00-00-0000.' })
    }

    if (nextEmail && nextEmail !== currentUser.email) {
      const emailConflict = await query('SELECT id FROM users WHERE email = $1 AND id <> $2', [nextEmail, currentUser.id])
      if (emailConflict.rows.length > 0) {
        return response.status(409).json({ message: 'Email already registered' })
      }
    }

    if (nextFullName && nextFullName !== currentUser.name) {
      const nameConflict = await query('SELECT id FROM users WHERE LOWER(name) = LOWER($1) AND id <> $2', [nextFullName, currentUser.id])
      if (nameConflict.rows.length > 0) {
        return response.status(409).json({ message: 'Full name already registered' })
      }
    }

    if (newPassword) {
      const match = await bcrypt.compare(currentPassword, currentUser.password)
      if (!match) {
        return response.status(401).json({ message: 'Current password is incorrect' })
      }
    }

    const currentParentName = currentUser.parentName || ''
    const currentParentEmail = currentUser.parentEmail || ''
    const currentParentPhone = currentUser.parentPhone || ''
    const currentYearLevel = currentUser.yearLevel || ''
    const currentProgram = currentUser.program || ''
    const currentSection = currentUser.section || ''
    const currentStudentId = currentUser.studentId || ''

    const updates = []
    const values = []
    let index = 1

    if (nextFullName && nextFullName !== currentUser.name) {
      updates.push(`name = $${index++}`)
      values.push(nextFullName)
    }

    if (nextEmail && nextEmail !== currentUser.email) {
      updates.push(`email = $${index++}`)
      values.push(nextEmail)
    }

    if (newPassword) {
      const hashed = await bcrypt.hash(newPassword, 10)
      updates.push(`password = $${index++}`)
      values.push(hashed)
    }

    if (payload.parentName !== undefined) {
      const nextValue = nextParentName || ''
      if (nextValue !== currentParentName) {
        updates.push(`parent_name = $${index++}`)
        values.push(nextValue || null)
      }
    }

    if (payload.parentEmail !== undefined) {
      const nextValue = nextParentEmail || ''
      if (nextValue !== currentParentEmail) {
        updates.push(`parent_email = $${index++}`)
        values.push(nextValue || null)
      }
    }

    if (payload.parentPhone !== undefined) {
      const nextValue = nextParentPhone || ''
      if (nextValue !== currentParentPhone) {
        updates.push(`parent_phone = $${index++}`)
        values.push(nextValue || null)
      }
    }

    if (payload.yearLevel !== undefined) {
      const nextValue = nextYearLevel || ''
      if (nextValue !== currentYearLevel) {
        updates.push(`year_level = $${index++}`)
        values.push(nextValue || null)
      }
    }

    if (payload.program !== undefined) {
      const nextValue = nextProgram || ''
      if (nextValue !== currentProgram) {
        updates.push(`program = $${index++}`)
        values.push(nextValue || null)
      }
    }

    if (payload.section !== undefined) {
      const nextValue = nextSection || ''
      if (nextValue !== currentSection) {
        updates.push(`section = $${index++}`)
        values.push(nextValue || null)
      }
    }

    if (payload.studentId !== undefined) {
      const nextValue = nextStudentId || ''
      if (nextValue !== currentStudentId) {
        updates.push(`student_id = $${index++}`)
        values.push(nextValue || null)
      }
    }

    if (updates.length === 0) {
      return response.status(422).json({ message: 'No changes detected' })
    }

    values.push(currentUser.id)
    const updateResult = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${index}
       RETURNING id,
                 name AS "fullName",
                 email,
                 role,
                 approval_status AS "approvalStatus",
                 parent_name AS "parentName",
                 parent_email AS "parentEmail",
                 parent_phone AS "parentPhone",
                 year_level AS "yearLevel",
                 program,
                 section,
                 student_id AS "studentId"`,
      values
    )

    const updatedUser = updateResult.rows[0]
    const token = jwt.sign({ sub: updatedUser.id, email: updatedUser.email, role: updatedUser.role }, config.jwtSecret, {
      expiresIn: '7d',
    })

    const meta = requestMeta(request)
    await logActivity({
      actorUserId: updatedUser.id,
      action: 'auth.profile_update',
      targetType: 'user',
      targetId: String(updatedUser.id),
      details: {
        emailChanged: !!nextEmail && nextEmail !== currentUser.email,
        nameChanged: !!nextFullName && nextFullName !== currentUser.name,
        passwordChanged: !!newPassword,
        studentDetailsChanged: hasStudentPayload,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => {})

    response.status(200).json({ token, user: updatedUser })
  } catch (error) {
    console.error(error)
    response.status(500).json({ message: 'Internal server error' })
  }
})

authRouter.post('/forgot-password', passwordResetRateLimit, async (request, response) => {
  const email = normalizeEmailValue(request.body?.email || '')
  if (!email) {
    return response.status(422).json({ message: 'Email is required' })
  }

  if (!isValidEmailAddress(email)) {
    return response.status(422).json({ message: 'Email address is invalid.' })
  }

  if (!config.mailEnabled || !isEmailConfigured()) {
    return response.status(503).json({ message: 'Email delivery is not configured' })
  }

  let userRow = null
  try {
    const result = await query('SELECT id, name FROM users WHERE email = $1', [email])
    userRow = result.rows[0] || null
  } catch (error) {
    console.error(error)
    return response.status(500).json({ message: 'Internal server error' })
  }

  response.status(200).json({ message: 'If an account exists for this email, a reset code has been sent.' })

  if (!userRow) {
    return
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const displayName = userRow.name || 'Student'
  const subject = 'Your Smart Attendance reset code'
  const htmlBody = buildResetEmail(displayName, code)
  const textBody = `Your Smart Attendance reset code is ${code}. This code expires in 15 minutes.`

  setImmediate(async () => {
    try {
      await query('UPDATE users SET reset_code = $1, reset_code_expires_at = NOW() + INTERVAL \'15 minutes\' WHERE id = $2', [
        code,
        userRow.id,
      ])
      await sendEmail({
        to: email,
        subject,
        html: htmlBody,
        text: textBody,
      })
    } catch (error) {
      console.error('Reset email failed:', error?.message || error)
    }
  })
})

authRouter.post('/reset-password', passwordResetRateLimit, async (request, response) => {
  const email = normalizeEmailValue(request.body?.email || '')
  const codeRaw = String(request.body?.code || '').trim()
  const password = sanitizePassword(request.body?.password || '')

  if (!email || !codeRaw || !password) {
    return response.status(422).json({ message: 'Email, code, and password are required' })
  }

  const code = codeRaw.replace(/\D+/g, '')
  if (code.length !== 6) {
    return response.status(422).json({ message: 'Reset code must be 6 digits' })
  }

  if (!isStrongPassword(password)) {
    return response.status(422).json({
      message: 'Password must be at least 10 characters and include uppercase, lowercase, a number, and a symbol.',
    })
  }

  try {
    const result = await query(
      'SELECT id FROM users WHERE email = $1 AND reset_code = $2 AND reset_code_expires_at > NOW()',
      [email, code]
    )
    if (result.rows.length === 0) {
      return response.status(422).json({ message: 'Invalid or expired reset code' })
    }

    const hashed = await bcrypt.hash(password, 10)
    await query('UPDATE users SET password = $1, reset_code = NULL, reset_code_expires_at = NULL WHERE id = $2', [
      hashed,
      result.rows[0].id,
    ])

    response.status(200).json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error(error)
    response.status(500).json({ message: 'Internal server error' })
  }
})

export { authRouter }
