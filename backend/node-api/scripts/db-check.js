import { query } from '../src/db/index.js'
import { config } from '../src/config/env.js'

if (!config.databaseUrl) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env or set it in your shell.')
  process.exit(1)
}

try {
  const result = await query('SELECT 1 AS ok')
  console.log('Database connection OK:', result.rows[0].ok)
  process.exit(0)
} catch (error) {
  console.error('Database connection failed:', error.message)
  process.exit(1)
}
