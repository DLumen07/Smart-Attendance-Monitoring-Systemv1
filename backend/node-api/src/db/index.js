import { Pool } from 'pg'
import { config } from '../config/env.js'

const pool = new Pool({ connectionString: config.databaseUrl })

export async function query(text, params) {
  return pool.query(text, params)
}

export default pool
