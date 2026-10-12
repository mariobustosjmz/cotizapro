/**
 * Rate Limiting Configuration
 *
 * Provides rate limiters for different types of endpoints
 * to prevent abuse, brute force attacks, and DoS attacks
 */

// Simple in-memory rate limiter for Next.js (stateless)
// For production with multiple instances, use Redis instead

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number }
}

const store: RateLimitStore = {}

/**
 * In-memory rate limiter
 * Note: This works for single-instance deployments
 * For production multi-instance, use Redis or similar
 */
export function createRateLimiter(options: {
  windowMs: number // Time window in milliseconds
  max: number // Max requests per window
  keyGenerator?: (request: Request) => string
  skipSuccessfulRequests?: boolean
}) {
  const { windowMs, max, keyGenerator, skipSuccessfulRequests = false } = options

  return function rateLimiter(
    request: Request,
    statusCode?: number
  ): { limited: boolean; remaining: number; resetTime: number } {
    // Skip rate limiting in non-production environments (development, test, E2E)
    // Also skip when explicitly disabled via env var (for E2E testing against production build)
    if (process.env.NODE_ENV !== 'production' || process.env.DISABLE_RATE_LIMIT === 'true') {
      return { limited: false, remaining: max, resetTime: 0 }
    }

    // Generate key for this request (IP-based by default)
    const key = keyGenerator?.(request) || extractClientIp(request)
    const now = Date.now()

    // Initialize or get existing record
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      }
    }

    // Increment counter
    store[key].count++

    // Determine if request should be limited
    const isLimited = store[key].count > max

    // Calculate remaining requests
    const remaining = Math.max(0, max - store[key].count)

    // Reset time in seconds
    const resetTime = Math.ceil(store[key].resetTime / 1000)

    // Skip counting if request was successful (optional)
    if (skipSuccessfulRequests && statusCode && statusCode < 400) {
      store[key].count--
    }

    return {
      limited: isLimited,
      remaining,
      resetTime,
    }
  }
}

/**
 * IP del cliente. De X-Forwarded-For se toma el salto más a la derecha: lo agrega el proxy propio
 * (Caddy/Traefik) y el cliente no puede falsificarlo; los saltos de la izquierda sí vienen del cliente.
 */
export function extractClientIp(request: Request): string {
  const hops = (request.headers.get('x-forwarded-for') ?? '').split(',').map((h) => h.trim()).filter(Boolean)
  return hops.at(-1) || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || '127.0.0.1'
}

// Pre-configured rate limiters for common scenarios

/**
 * Default API rate limiter: 100 requests per 15 minutes
 * Suitable for general API endpoints
 */
export const defaultApiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  keyGenerator: (request) => extractClientIp(request),
})

/**
 * Strict rate limiter for authentication: 5 requests per 15 minutes
 * Suitable for login/signup endpoints to prevent brute force
 */
export const strictAuthLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: (request) => extractClientIp(request),
  skipSuccessfulRequests: true, // Don't count successful logins
})

/**
 * Generous API limiter: 1000 requests per hour
 * Suitable for authenticated API endpoints
 */
export const generousApiLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  keyGenerator: (request) => extractClientIp(request),
})

/**
 * Message limiter: 50 requests per day
 * Suitable for email/SMS sending endpoints
 */
export const messageLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 50,
  keyGenerator: (request) => extractClientIp(request),
})

/**
 * File upload limiter: 5 requests per minute
 * Suitable for file upload endpoints
 */
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  keyGenerator: (request) => extractClientIp(request),
})

/**
 * Apply rate limit to a response
 * Returns appropriate status code and headers
 */
export function applyRateLimit(
  limitResult: { limited: boolean; remaining: number; resetTime: number },
  response?: Response
): Response {
  const headers = new Headers(response?.headers)

  // Add rate limit headers
  headers.set("X-RateLimit-Remaining", limitResult.remaining.toString())
  headers.set("X-RateLimit-Reset", limitResult.resetTime.toString())

  if (limitResult.limited) {
    return new Response(
      JSON.stringify({
        error: "Too many requests, please try again later.",
        retryAfter: limitResult.resetTime,
      }),
      {
        status: 429,
        headers: {
          ...Object.fromEntries(headers.entries()),
          "Retry-After": limitResult.resetTime.toString(),
        },
      }
    )
  }

  return response || new Response(null, { headers })
}
