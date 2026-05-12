import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { query } from './index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const sqlDir = path.resolve(__dirname, '../../sql')

let migrationRan = false

async function runSqlFile(fileName) {
  const fullPath = path.join(sqlDir, fileName)
  const sql = await fs.readFile(fullPath, 'utf8')
  await query(sql)
}

export async function ensureDatabasePatches() {
  if (migrationRan) {
    return
  }

  await runSqlFile('patch-core.sql')
  await runSqlFile('patch-auth.sql')

  migrationRan = true
}
