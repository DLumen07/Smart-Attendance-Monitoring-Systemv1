import { createApp } from '../src/app.js'
import { config } from '../src/config/env.js'

if (!config.databaseUrl) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env or set it in your shell.')
  process.exit(1)
}

const app = createApp({ allowedOrigins: [] })

const server = app.listen(0, async () => {
  const address = server.address()
  const port = typeof address === 'object' ? address.port : 0
  const baseUrl = `http://127.0.0.1:${port}`
  const email = `smoke_${Date.now()}@example.local`
  const password = 'SmokeTest123!'
  const name = 'Smoke Test'

  try {
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    const registerBody = await registerResponse.json().catch(() => ({}))
    if (registerResponse.status !== 201) {
      console.error('Register failed:', registerResponse.status, registerBody)
      process.exit(1)
    }

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const loginBody = await loginResponse.json().catch(() => ({}))
    if (loginResponse.status !== 200) {
      console.error('Login failed:', loginResponse.status, loginBody)
      process.exit(1)
    }

    console.log('Auth smoke test OK:', {
      registerUserId: registerBody?.user?.id,
      loginUserId: loginBody?.user?.id,
    })
    process.exit(0)
  } catch (error) {
    console.error('Smoke test error:', error.message)
    process.exit(1)
  } finally {
    server.close()
  }
})
