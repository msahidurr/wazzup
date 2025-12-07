export class WhatsAppError extends Error {
  constructor(message, code, details = {}) {
    super(message)
    this.name = "WhatsAppError"
    this.code = code
    this.details = details
  }
}

export class TemplateError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = "TemplateError"
    this.details = details
  }
}

export class AuthenticationError extends Error {
  constructor(message) {
    super(message)
    this.name = "AuthenticationError"
  }
}

export function handleWhatsAppError(error) {
  console.error("[WhatsApp Error]", error)

  if (error.response?.status === 429) {
    return {
      status: 429,
      message: "Rate limit exceeded. Please try again later.",
      code: "RATE_LIMIT",
    }
  }

  if (error.response?.status === 401) {
    return {
      status: 401,
      message: "Invalid WhatsApp credentials.",
      code: "INVALID_CREDENTIALS",
    }
  }

  if (error.response?.status === 400) {
    return {
      status: 400,
      message: "Invalid request to WhatsApp API.",
      code: "INVALID_REQUEST",
      details: error.response.data,
    }
  }

  return {
    status: 500,
    message: "Failed to communicate with WhatsApp API.",
    code: "API_ERROR",
  }
}

export function logError(level, message, context = {}) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    context,
  }

  if (level === "error") {
    console.error(JSON.stringify(logEntry))
  } else if (level === "warn") {
    console.warn(JSON.stringify(logEntry))
  } else {
    console.log(JSON.stringify(logEntry))
  }

  // TODO: Send to external logging service (e.g., Sentry, LogRocket)
}
