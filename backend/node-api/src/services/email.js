import nodemailer from 'nodemailer'
import { config } from '../config/env.js'

let cachedTransport = null

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const getTransport = () => {
  if (cachedTransport) {
    return cachedTransport
  }

  const secure = config.smtpSecure === 'ssl'
  const requireTLS = config.smtpSecure === 'tls'
  const ignoreTLS = config.smtpSecure === 'none'

  cachedTransport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
    requireTLS,
    ignoreTLS,
  })

  return cachedTransport
}

export const isEmailConfigured = () => Boolean(config.smtpHost && config.smtpUser && config.smtpPass)

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!isEmailConfigured()) {
    throw new Error('Email delivery not configured')
  }

  const transport = getTransport()
  const fromAddress = config.mailFrom || config.smtpUser
  if (!fromAddress) {
    throw new Error('MAIL_FROM or SMTP_USER must be set')
  }

  const fromName = config.mailFromName ? `"${config.mailFromName}" ` : ''
  const from = `${fromName}<${fromAddress}>`

  await transport.sendMail({
    from,
    to,
    subject,
    html,
    text,
    replyTo: config.mailReplyTo || undefined,
  })
}

export const buildResetEmail = (name, code) => {
  const safeName = escapeHtml(name)
  const safeCode = escapeHtml(code)

  return (
    '<div style="font-family:Arial,sans-serif;background:#f8faf9;padding:24px;border-radius:16px">' +
    '<h2 style="color:#18563e;margin:0 0 12px">Password Reset Code</h2>' +
    `<p style="color:#334155;margin:0 0 12px">Hi ${safeName}, use the code below to reset your password:</p>` +
    `<div style="font-size:28px;font-weight:700;letter-spacing:6px;color:#18563e;background:#eaf4ef;padding:12px 16px;border-radius:12px;display:inline-block">${safeCode}</div>` +
    '<p style="color:#64748b;margin:16px 0 0">This code expires in 15 minutes.</p>' +
    '</div>'
  )
}

export const buildAttendanceAlertEmail = (parentName, studentName, className, sessionName, sessionDate) => {
  const safeParent = escapeHtml(parentName)
  const safeStudent = escapeHtml(studentName)
  const safeClass = escapeHtml(className)
  const safeSession = escapeHtml(sessionName)
  const safeDate = escapeHtml(sessionDate)

  return (
    '<div style="font-family:Arial,sans-serif;background:#f8faf9;padding:24px;border-radius:16px">' +
    '<h2 style="color:#18563e;margin:0 0 12px">Attendance Alert</h2>' +
    `<p style="color:#334155;margin:0 0 16px">Hello ${safeParent},</p>` +
    `<p style="color:#334155;margin:0 0 16px">This is an alert that <strong>${safeStudent}</strong> has recorded <strong>3 consecutive absences</strong> in <strong>${safeClass}</strong>.</p>` +
    '<div style="background:#eaf4ef;border-radius:12px;padding:12px 16px;margin:0 0 16px">' +
    '<div style="color:#18563e;font-weight:700;font-size:14px">Most recent session</div>' +
    `<div style="color:#1f2937;font-size:14px">${safeSession}</div>` +
    `<div style="color:#6b7280;font-size:12px;margin-top:4px">${safeDate}</div>` +
    '</div>' +
    '<p style="color:#334155;margin:0 0 16px">Next steps: Please check in with your student or contact the instructor if you have questions.</p>' +
    '<p style="color:#6b7280;margin:0;font-size:12px">Smart Attendance Monitoring</p>' +
    '</div>'
  )
}
