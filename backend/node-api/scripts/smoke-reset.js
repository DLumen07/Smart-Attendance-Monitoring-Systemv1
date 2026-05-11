import { createApp } from '../src/app.js'
import { config } from '../src/config/env.js'
import { query } from '../src/db/index.js'
import { isEmailConfigured } from '../src/services/email.js'

if (!config.databaseUrl) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env or set it in your shell.')
  process.exit(1)
}

const app = createApp({ allowedOrigins: [] })

const server = app.listen(0, async () => {
  const address = server.address()
  const port = typeof address === 'object' ? address.port : 0
  const baseUrl = `http://127.0.0.1:${port}`
  const email = `smoke_reset_${Date.now()}@example.local`
  const password = 'SmokeReset123!'
  const newPassword = 'SmokeReset456!'
  const suffix = Array.from({ length: 5 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('')
  const fullName = `Smoke Reset ${suffix}`

  try {
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        password,
        role: 'student',
      }),
    })

    if (registerResponse.status !== 201) {
      const registerBody = await registerResponse.json().catch(() => ({}))
      console.error('Register failed:', registerResponse.status, registerBody)
      process.exit(1)
    }

    const forgotResponse = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (![200, 503].includes(forgotResponse.status)) {
      const forgotBody = await forgotResponse.json().catch(() => ({}))
      console.error('Forgot password failed:', forgotResponse.status, forgotBody)
      process.exit(1)
    }

    if (forgotResponse.status === 503 && !isEmailConfigured()) {
      await query(
        'UPDATE users SET reset_code = $1, reset_code_expires_at = NOW() + INTERVAL \'15 minutes\' WHERE email = $2',
        ['123456', email]
      )
    }

    const codeResult = await query('SELECT reset_code FROM users WHERE email = $1', [email])
    const resetCode = codeResult.rows[0]?.reset_code
    if (!resetCode) {
      console.error('Reset code was not stored on the user record.')
      process.exit(1)
    }

    const resetResponse = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        code: resetCode,
        password: newPassword,
      }),
    })

    if (resetResponse.status !== 200) {
      const resetBody = await resetResponse.json().catch(() => ({}))
      console.error('Reset password failed:', resetResponse.status, resetBody)
      process.exit(1)
    }

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: newPassword }),
    })

    if (loginResponse.status !== 200) {
      const loginBody = await loginResponse.json().catch(() => ({}))
      console.error('Login with new password failed:', loginResponse.status, loginBody)
      process.exit(1)
    }

    console.log('Reset smoke test OK')
    process.exit(0)
  } catch (error) {
    console.error('Smoke reset error:', error.message)
    process.exit(1)
  } finally {
    server.close()
  }
})
