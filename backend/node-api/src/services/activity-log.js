import { query } from '../db/index.js'

function cleanText(value, maxLen = 255) {
  const text = String(value || '').trim()
  if (!text) {
    return null
  }
  return text.slice(0, maxLen)
}

export function requestMeta(request) {
  return {
    ipAddress: cleanText(request.headers['x-forwarded-for'] || request.ip, 64),
    userAgent: cleanText(request.headers['user-agent'], 255),
  }
}

export async function logActivity({ actorUserId = null, action, targetType = null, targetId = null, details = {}, ipAddress = null, userAgent = null }) {
  if (!action) {
    return
  }

  await query(
    `INSERT INTO activity_logs (actor_user_id, action, target_type, target_id, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
    [
      actorUserId || null,
      String(action).trim().slice(0, 120),
      cleanText(targetType, 60),
      cleanText(targetId, 60),
      JSON.stringify(details || {}),
      cleanText(ipAddress, 64),
      cleanText(userAgent, 255),
    ]
  )
}
