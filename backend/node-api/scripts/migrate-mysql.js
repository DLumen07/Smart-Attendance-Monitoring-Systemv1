import mysql from 'mysql2/promise'
import { Pool } from 'pg'
import { config } from '../src/config/env.js'

const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'smart_attendance',
}

const shouldTruncate = (process.env.MIGRATE_TRUNCATE || 'false').toLowerCase() === 'true'

if (!config.databaseUrl) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env or set it in your shell.')
  process.exit(1)
}

const tables = [
  'attendance_alerts',
  'attendance',
  'sessions',
  'class_members',
  'class_schedules',
  'classes',
  'users',
]

const setSequence = async (client, table) => {
  await client.query(
    `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0))`,
    [table]
  )
}

const insertRows = async (client, sql, rows, mapper) => {
  for (const row of rows) {
    await client.query(sql, mapper(row))
  }
}

try {
  const mysqlConn = await mysql.createConnection({
    ...mysqlConfig,
    dateStrings: true,
  })
  const pgPool = new Pool({ connectionString: config.databaseUrl })
  const pgClient = await pgPool.connect()

  const [users] = await mysqlConn.query('SELECT * FROM users')
  const [classes] = await mysqlConn.query('SELECT * FROM classes')
  const [classSchedules] = await mysqlConn.query('SELECT * FROM class_schedules')
  const [classMembers] = await mysqlConn.query('SELECT * FROM class_members')
  const [sessions] = await mysqlConn.query('SELECT * FROM sessions')
  const [attendance] = await mysqlConn.query('SELECT * FROM attendance')
  const [attendanceAlerts] = await mysqlConn.query('SELECT * FROM attendance_alerts')

  await pgClient.query('BEGIN')

  if (shouldTruncate) {
    await pgClient.query(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`)
  } else {
    const existing = await pgClient.query('SELECT COUNT(*)::int AS count FROM users')
    if (existing.rows[0]?.count > 0) {
      throw new Error('Target database is not empty. Set MIGRATE_TRUNCATE=true to overwrite.')
    }
  }

  await insertRows(
    pgClient,
    `INSERT INTO users (id, name, email, password, role, parent_name, parent_email, parent_phone, reset_code, reset_code_expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`
    ,
    users,
    (row) => [
      row.id,
      row.full_name,
      row.email,
      row.password_hash,
      row.role,
      row.parent_name,
      row.parent_email,
      row.parent_phone,
      row.reset_code,
      row.reset_code_expires_at,
      row.created_at,
    ]
  )

  await insertRows(
    pgClient,
    `INSERT INTO classes (id, instructor_id, name, join_code, created_at)
     VALUES ($1, $2, $3, $4, $5)`
    ,
    classes,
    (row) => [row.id, row.instructor_id, row.name, row.join_code, row.created_at]
  )

  await insertRows(
    pgClient,
    `INSERT INTO class_schedules (id, class_id, day_of_week, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5)`
    ,
    classSchedules,
    (row) => [row.id, row.class_id, row.day_of_week, row.start_time, row.end_time]
  )

  await insertRows(
    pgClient,
    `INSERT INTO class_members (id, class_id, student_id, joined_at)
     VALUES ($1, $2, $3, $4)`
    ,
    classMembers,
    (row) => [row.id, row.class_id, row.student_id, row.joined_at]
  )

  await insertRows(
    pgClient,
    `INSERT INTO sessions (id, class_id, session_name, session_code, attendance_mode, status, starts_at, ends_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
    ,
    sessions,
    (row) => [
      row.id,
      row.class_id,
      row.session_name,
      row.session_code,
      row.attendance_mode,
      row.status,
      row.starts_at,
      row.ends_at,
      row.created_at,
    ]
  )

  await insertRows(
    pgClient,
    `INSERT INTO attendance (id, session_id, student_id, method, status, checked_in_at, reviewed_at, reviewed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
    ,
    attendance,
    (row) => [
      row.id,
      row.session_id,
      row.student_id,
      row.method,
      row.status,
      row.checked_in_at,
      row.reviewed_at,
      row.reviewed_by,
    ]
  )

  await insertRows(
    pgClient,
    `INSERT INTO attendance_alerts (id, class_id, session_id, student_id, alert_type, channel, status, error_message, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
    ,
    attendanceAlerts,
    (row) => [
      row.id,
      row.class_id,
      row.session_id,
      row.student_id,
      row.alert_type,
      row.channel,
      row.status,
      row.error_message,
      row.sent_at,
    ]
  )

  for (const table of [...tables].reverse()) {
    await setSequence(pgClient, table)
  }

  await pgClient.query('COMMIT')
  await mysqlConn.end()
  pgClient.release()
  await pgPool.end()

  console.log('Migration completed successfully.')
  console.log(`Users: ${users.length}`)
  console.log(`Classes: ${classes.length}`)
  console.log(`Sessions: ${sessions.length}`)
  console.log(`Attendance: ${attendance.length}`)
  process.exit(0)
} catch (error) {
  console.error('Migration failed:', error.message)
  process.exit(1)
}
