import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { authRouter } from './routes/auth.js'
import { healthRouter } from './routes/health.js'

export function createApp({ allowedOrigins = [] } = {}) {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(express.json({ limit: '1mb' }))
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          callback(null, true)
          return
        }

        callback(new Error('CORS origin not allowed'))
      },
      credentials: true,
    })
  )

  app.get('/', (_request, response) => {
    response.status(200).json({
      status: 'ok',
      service: 'smart-attendance-node-api',
    })
  })

  app.use('/health', healthRouter)
  app.use('/auth', authRouter)

  app.use((_request, response) => {
    response.status(404).json({ message: 'Route not found' })
  })

  app.use((error, _request, response, _next) => {
    response.status(500).json({
      message: error?.message || 'Internal server error',
    })
  })

  return app
}

export default createApp