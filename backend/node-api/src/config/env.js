import dotenv from 'dotenv'

dotenv.config({ path: new URL('../../.env', import.meta.url) })

const parseList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export const config = {
  environment: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  corsOrigins: parseList(process.env.CORS_ORIGINS),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'replace-this-in-production',
  mailEnabled: (process.env.MAIL_ENABLED || 'true').toLowerCase() === 'true',
  mailFrom: process.env.MAIL_FROM || 'noreply@smart-attendance.local',
  mailFromName: process.env.MAIL_FROM_NAME || 'Smart Attendance Monitoring',
  mailReplyTo: process.env.MAIL_REPLY_TO || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpSecure: (process.env.SMTP_SECURE || 'tls').toLowerCase(),
  lateCutoffMinutes: Number(process.env.LATE_CUTOFF_MINUTES || 5),
}