import bcrypt from 'bcryptjs'
import { query } from '../db/index.js'
import { config } from '../config/env.js'

export async function ensureAdminAccount() {
  const email = String(config.adminEmail || '').trim().toLowerCase()
  const password = String(config.adminPassword || '')
  const fullName = String(config.adminName || 'System Administrator').trim()

  if (!email || !password) {
    return { enabled: false }
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [email])
  const hashed = await bcrypt.hash(password, 10)

  if (existing.rows.length === 0) {
    await query(
      `INSERT INTO users (name, email, password, role, approval_status)
       VALUES ($1, $2, $3, 'admin', 'approved')`,
      [fullName || 'System Administrator', email, hashed]
    )
    return { enabled: true, created: true }
  }

  await query(
    `UPDATE users
     SET name = $1,
         password = $2,
         role = 'admin',
         approval_status = 'approved'
     WHERE email = $3`,
    [fullName || 'System Administrator', hashed, email]
  )

  return { enabled: true, created: false }
}
