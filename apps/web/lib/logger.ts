/**
 * PII-Safe Logger
 *
 * Provides secure logging that automatically redacts personally identifiable information
 * (email addresses, phone numbers, passwords, API keys, etc.)
 */

interface LogContext {
  [key: string]: any
}

/**
 * Redacts PII from log data
 * Replaces sensitive fields with [REDACTED]
 */
function sanitizePII(data: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) return "[RECURSIVE]"

  if (data === null || data === undefined) return data

  // Handle strings
  if (typeof data === "string") {
    // Check for common PII patterns
    if (isEmail(data)) return "[EMAIL_REDACTED]"
    if (isPhoneNumber(data)) return "[PHONE_REDACTED]"
    if (isApiKey(data)) return "[KEY_REDACTED]"
    if (isJwt(data)) return "[TOKEN_REDACTED]"
    return data
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizePII(item, depth + 1))
  }

  // Handle objects
  if (typeof data === "object") {
    const sanitized: LogContext = {}
    const piiFields = [
      "email",
      "email_address",
      "phone",
      "phone_number",
      "password",
      "passwd",
      "secret",
      "api_key",
      "apiKey",
      "stripe_key",
      "token",
      "auth_token",
      "access_token",
      "refresh_token",
      "webhook_secret",
      "cron_secret",
      "supabase_key",
      "resend_key",
      "twilio_key",
      "credit_card",
      "ssn",
      "social_security",
      "passport",
      "drivers_license",
    ]

    for (const key in data) {
      const lowerKey = key.toLowerCase()

      // Check if key contains PII field names
      if (piiFields.some((field) => lowerKey.includes(field))) {
        sanitized[key] = "[REDACTED]"
      } else {
        sanitized[key] = sanitizePII(data[key], depth + 1)
      }
    }

    return sanitized
  }

  return data
}

/**
 * Check if string looks like an email
 */
function isEmail(str: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
}

/**
 * Check if string looks like a phone number
 */
function isPhoneNumber(str: string): boolean {
  // International format or common patterns
  return /^(\+|00)?[1-9]\d{1,14}$/.test(str.replace(/[\s\-()]/g, ""))
}

/**
 * Check if string looks like an API key
 */
function isApiKey(str: string): boolean {
  const keyPatterns = [
    /^sk_test_/, // Stripe test key
    /^sk_live_/, // Stripe live key
    /^pk_test_/, // Stripe publishable
    /^pk_live_/, // Stripe publishable
    /^whsec_/, // Stripe webhook
    /^eyJ/, // JWT pattern
  ]
  return keyPatterns.some((pattern) => pattern.test(str))
}

/**
 * Check if string looks like a JWT token
 */
function isJwt(str: string): boolean {
  return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(str)
}

/**
 * Central logger with PII redaction
 */
export const logger = {
  /**
   * Log info level message
   */
  info: (message: string, context?: LogContext) => {
    const sanitized = context ? sanitizePII(context) : undefined
    console.log(
      `[INFO] ${message}`,
      sanitized ? JSON.stringify(sanitized) : ""
    )
  },

  /**
   * Log warning level message
   */
  warn: (message: string, context?: LogContext) => {
    const sanitized = context ? sanitizePII(context) : undefined
    console.warn(
      `[WARN] ${message}`,
      sanitized ? JSON.stringify(sanitized) : ""
    )
  },

  /**
   * Log error level message
   * Includes stack trace if available
   */
  error: (message: string, error?: any, context?: LogContext) => {
    const sanitizedError = error
      ? {
        name: error.name,
        message: error.message,
        code: error.code,
        // Don't include full stack in production
        ...(process.env.NODE_ENV === "development" && {
          stack: error.stack,
        }),
      }
      : undefined

    const sanitizedContext = context ? sanitizePII(context) : undefined

    console.error(`[ERROR] ${message}`, {
      ...(sanitizedError && { error: sanitizedError }),
      ...(sanitizedContext && { context: sanitizedContext }),
    })
  },

  /**
   * Log debug level message (only in development)
   */
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === "development") {
      const sanitized = context ? sanitizePII(context) : undefined
      console.debug(
        `[DEBUG] ${message}`,
        sanitized ? JSON.stringify(sanitized) : ""
      )
    }
  },

  /**
   * Log security-related events
   * Always redacts PII
   */
  security: (message: string, context?: LogContext) => {
    const sanitized = context ? sanitizePII(context) : undefined
    console.log(
      `[SECURITY] ${message}`,
      sanitized ? JSON.stringify(sanitized) : ""
    )
  },

  /**
   * Log API request details
   * Redacts sensitive data from request/response
   */
  api: (
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ) => {
    const sanitized = context ? sanitizePII(context) : undefined
    console.log(
      `[API] ${method} ${path} ${statusCode} ${duration}ms`,
      sanitized ? JSON.stringify(sanitized) : ""
    )
  },

  /**
   * Log database query
   * Redacts values but not column names
   */
  database: (operation: string, table: string, context?: LogContext) => {
    const sanitized = context ? sanitizePII(context) : undefined
    console.log(
      `[DB] ${operation} ${table}`,
      sanitized ? JSON.stringify(sanitized) : ""
    )
  },
}

/**
 * Middleware function to add request logging
 */
export function createRequestLogger() {
  return (request: Request) => {
    const startTime = Date.now()

    // Log request
    logger.api(request.method, new URL(request.url).pathname, 0, 0, {
      headers: sanitizePII(Object.fromEntries(request.headers)),
    })

    // Return middleware that can log response
    return () => {
      const duration = Date.now() - startTime
      logger.api(request.method, new URL(request.url).pathname, 200, duration)
    }
  }
}

/**
 * Performance logger
 */
export function createPerformanceLogger(label: string) {
  const startTime = Date.now()

  return {
    log: (checkpoint: string) => {
      const duration = Date.now() - startTime
      console.log(`[PERF] ${label} - ${checkpoint}: ${duration}ms`)
    },
    end: () => {
      const duration = Date.now() - startTime
      console.log(`[PERF] ${label} completed in ${duration}ms`)
    },
  }
}

export default logger
