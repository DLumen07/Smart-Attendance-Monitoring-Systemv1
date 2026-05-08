import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db/index.js'
import { config } from '../config/env.js'

const authRouter = Router()

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

authRouter.post('/register', async (request, response) => {
  try {
    const body = registerSchema.parse(request.body)

    const existing = await query('SELECT id FROM users WHERE email = $1', [body.email])
    if (existing.rows.length > 0) {
      return response.status(409).json({ message: 'Email already registered' })
    }

    const hashed = await bcrypt.hash(body.password, 10)
    const result = await query(
      'INSERT INTO users (name, email, password, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email, role',
      [body.name, body.email, hashed, 'student']
    )

    const user = result.rows[0]
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwtSecret, {
      expiresIn: '7d',
    })

    response.status(201).json({ token, user })
  } catch (error) {
    if (error?.name === 'ZodError') {
      return response.status(400).json({ message: 'Invalid request', errors: error.errors })
    }
    console.error(error)
    response.status(500).json({ message: 'Internal server error' })
  }
})

authRouter.post('/login', async (request, response) => {
  try {
    const body = loginSchema.parse(request.body)

    const result = await query('SELECT id, name, email, password, role FROM users WHERE email = $1', [body.email])
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

    delete user.password
    response.status(200).json({ token, user })
  } catch (error) {
    if (error?.name === 'ZodError') {
      return response.status(400).json({ message: 'Invalid request', errors: error.errors })
    }
    console.error(error)
    response.status(500).json({ message: 'Internal server error' })
  }
})

// TODO: Implement forgot-password and reset-password flows (email + tokens)
authRouter.post('/forgot-password', (_request, response) => {
  response.status(501).json({ message: 'Forgot password not implemented yet' })
})

authRouter.post('/reset-password', (_request, response) => {
  response.status(501).json({ message: 'Reset password not implemented yet' })
})

export { authRouter }