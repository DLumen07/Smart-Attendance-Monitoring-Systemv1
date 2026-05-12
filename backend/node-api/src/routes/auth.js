import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db/index.js'
import { config } from '../config/env.js'
import { buildResetEmail, isEmailConfigured, sendEmail } from '../services/email.js'
import { logActivity, requestMeta } from '../services/activity-log.js'

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
})

const loginSchema = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
})

const normalizeName = (value) => normalizeWhitespace(value)
const normalizeNamePart = (value) => normalizeWhitespace(value).replace(/[^A-Za-z'\- ]+/g, '')
const sanitizePhone = (value) => stripControlChars(value).replace(/[^\d+\-()\s]/g, '').trim()

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
      'INSERT INTO users (name, email, password, role, approval_status, parent_name, parent_email, parent_phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, role, approval_status AS "approvalStatus"',
      [fullName, email, hashed, role, approvalStatus, parentName || null, parentEmail || null, parentPhone || null]
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
