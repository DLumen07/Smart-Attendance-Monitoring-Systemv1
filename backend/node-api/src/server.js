import { config } from './config/env.js'
import { createApp } from './app.js'

const app = createApp({ allowedOrigins: config.corsOrigins })

app.listen(config.port, () => {
  console.log(`Smart Attendance Node API running on http://localhost:${config.port}`)
})