import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db/index.js'
import { config } from '../config/env.js'
import { buildResetEmail, isEmailConfigured, sendEmail } from '../services/email.js'

const authRouter = Router()

const registerSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(['student', 'instructor']),
  parentName: z.string().optional().default(''),
  parentEmail: z.string().optional().default(''),
  parentPhone: z.string().optional().default(''),
})

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
})

const normalizeName = (value) => value.replace(/\s+/g, ' ').trim()

const isValidFullName = (value, requireTwoParts = false) => {
  if (!value) {
    return false
  }

  if (value.length > 120) {
    return false
  }

  if (!/^[A-Za-z][A-Za-z'\- ]+$/.test(value)) {
    return false
  }

  if (requireTwoParts) {
    const parts = value.split(' ').filter(Boolean)
    if (parts.length < 2) {
      return false
    }
  }

  return true
}

const isValidEmailAddress = (value) => {
  if (!value || value.length > 190) {
    return false
  }

  return z.string().email().safeParse(value).success
}

authRouter.post('/register', async (request, response) => {
  try {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return response.status(422).json({ message: 'Invalid registration payload' })
    }

    const body = parsed.data
    const fullName = normalizeName(body.fullName)
    const email = body.email.trim().toLowerCase()
    const password = body.password
    const role = body.role
    let parentName = normalizeName(body.parentName)
    let parentEmail = body.parentEmail.trim().toLowerCase()
    let parentPhone = body.parentPhone.trim()

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

    if (password.length < 8) {
      return response.status(422).json({ message: 'Password must be at least 8 characters.' })
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
      'INSERT INTO users (name, email, password, role, parent_name, parent_email, parent_phone) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role',
      [fullName, email, hashed, role, parentName || null, parentEmail || null, parentPhone || null]
    )

    const user = result.rows[0]
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
      },
    })
  } catch (error) {
    console.error(error)
    response.status(500).json({ message: 'Internal server error' })
  }
})

authRouter.post('/login', async (request, response) => {
  try {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return response.status(422).json({ message: 'Email and password are required' })
    }

    const body = parsed.data
    const email = body.email.trim().toLowerCase()

    if (!email || !body.password) {
      return response.status(422).json({ message: 'Email and password are required' })
    }

    const result = await query('SELECT id, name, email, password, role FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) {
      return response.status(401).json({ message: 'Invalid credentials' })
    }

    const user = result.rows[0]
    const match = await bcrypt.compare(body.password, user.password)
    if (!match) {
      return response.status(401).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwtSecret, {
      expiresIn: '7d',
    })

    response.status(200).json({
      token,
      user: {
        id: user.id,
        fullName: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error(error)
    response.status(500).json({ message: 'Internal server error' })
  }
})

authRouter.post('/forgot-password', async (request, response) => {
  const email = String(request.body?.email || '').trim().toLowerCase()
  if (!email) {
    return response.status(422).json({ message: 'Email is required' })
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

authRouter.post('/reset-password', async (request, response) => {
  const email = String(request.body?.email || '').trim().toLowerCase()
  const codeRaw = String(request.body?.code || '').trim()
  const password = String(request.body?.password || '')

  if (!email || !codeRaw || !password) {
    return response.status(422).json({ message: 'Email, code, and password are required' })
  }

  const code = codeRaw.replace(/\D+/g, '')
  if (code.length !== 6) {
    return response.status(422).json({ message: 'Reset code must be 6 digits' })
  }

  if (password.length < 8) {
    return response.status(422).json({ message: 'Password must be at least 8 characters' })
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