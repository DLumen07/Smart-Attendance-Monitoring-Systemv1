import { config } from './config/env.js'
import { createApp } from './app.js'
import { ensureAdminAccount } from './services/admin-bootstrap.js'
import { ensureDatabasePatches } from './db/migrate.js'

const app = createApp({ allowedOrigins: config.corsOrigins })

async function startServer() {
  try {
    await ensureDatabasePatches()

    const adminBootstrap = await ensureAdminAccount()
    if (adminBootstrap?.enabled) {
      const mode = adminBootstrap.created ? 'created' : 'updated'
      console.log(`Admin account ${mode} for ${config.adminEmail}`)
    }
  } catch (error) {
    console.error('Admin bootstrap failed:', error?.message || error)
  }

  app.listen(config.port, () => {
    console.log(`Smart Attendance Node API running on http://localhost:${config.port}`)
  })
}

startServer()