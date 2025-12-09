export function replaceTemplateVariables(content, variables = {}) {
  let result = content

  Object.entries(variables).forEach(([key, value]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g")
    result = result.replace(pattern, value || "")
  })

  return result
}

export function extractTemplateVariables(content) {
  const regex = /{{(\s*\w+\s*)}}/g
  const variables = []
  let match

  while ((match = regex.exec(content)) !== null) {
    const varName = match[1].trim()
    if (!variables.includes(varName)) {
      variables.push(varName)
    }
  }

  return variables
}

export function validatePhoneNumber(phone) {
  // E.164 format: +[country code][number]
  const e164Regex = /^\+?[1-9]\d{1,14}$/
  return e164Regex.test(phone)
}

export function formatPhoneNumberE164(phone) {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "")

  // Add country code if not present (default to +1 for US)
  if (cleaned.length === 10) {
    return `+1${cleaned}`
  }

  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+${cleaned}`
  }

  // Assume it's already in a valid format
  return `+${cleaned}`
}

export function calculateMessageQuotaUsage(used, quota) {
  return quota > 0 ? Math.round((used / quota) * 100) : 0
}

export function isQuotaExceeded(used, quota) {
  return used >= quota
}

export async function scheduleMessageSend(shopId, templateId, recipients, delayMinutes = 0) {
  const sendAt = new Date(Date.now() + delayMinutes * 60 * 1000)

  // TODO: Implement job queue scheduling with BullMQ
  return {
    scheduled: true,
    sendAt,
    recipientCount: recipients.length,
  }
}
