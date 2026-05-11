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
  const fromName = config.mailFromName ? `"${config.mailFromName}" ` : ''
  const from = `${fromName}<${config.mailFrom}>`

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
