import bcrypt from 'bcryptjs'
import { config } from '../src/config/env.js'
import { query } from '../src/db/index.js'

if (!config.databaseUrl) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env or set it in your shell.')
  process.exit(1)
}

const demoUser = {
  fullName: 'Demo Instructor',
  email: 'instructor@demo.local',
  password: 'Instructor123!',
  role: 'instructor',
}

try {
  const passwordHash = await bcrypt.hash(demoUser.password, 10)
  const existing = await query('SELECT id FROM users WHERE email = $1', [demoUser.email])

  if (existing.rows.length > 0) {
    await query('UPDATE users SET name = $1, password = $2, role = $3 WHERE id = $4', [
      demoUser.fullName,
      passwordHash,
      demoUser.role,
      existing.rows[0].id,
    ])
    console.log('Updated demo instructor account.')
    process.exit(0)
  }

  await query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [
    demoUser.fullName,
    demoUser.email,
    passwordHash,
    demoUser.role,
  ])

  console.log('Created demo instructor account.')
  process.exit(0)
} catch (error) {
  console.error('Seed demo failed:', error.message)
  process.exit(1)
}
