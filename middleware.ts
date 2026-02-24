import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

// Request size limits for security
// Prevents DoS attacks via oversized payloads
const REQUEST_SIZE_LIMITS = {
  DEFAULT: 1024 * 1024,           // 1 MB default
  PDF_EXPORT: 10 * 1024 * 1024,   // 10 MB for PDF exports
  FILE_UPLOAD: 50 * 1024 * 1024,  // 50 MB for file uploads
}

/**
 * Check if request size exceeds configured limits
 * Returns 413 Payload Too Large if exceeded
 */
function checkRequestSize(request: NextRequest): NextResponse | null {
  const contentLength = request.headers.get('content-length')
  if (!contentLength) return null

  const size = parseInt(contentLength, 10)
  let limit = REQUEST_SIZE_LIMITS.DEFAULT

  // Route-specific limits
  if (request.nextUrl.pathname.includes('/api/export/')) {
    limit = REQUEST_SIZE_LIMITS.PDF_EXPORT
  } else if (request.nextUrl.pathname.includes('/api/upload/')) {
    limit = REQUEST_SIZE_LIMITS.FILE_UPLOAD
  }

  if (size > limit) {
    return NextResponse.json(
      { error: 'Request payload too large' },
      { status: 413, statusText: 'Payload Too Large' }
    )
  }

  return null
}

const ALLOWED_ORIGINS = [
  'http://localhost:4200',
  'http://localhost:3000',
]

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  // Allow any localhost / 127.0.0.1 port (Flutter web dev server uses ephemeral ports)
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true
  return false
}

function corsHeaders(origin: string | null) {
  const allowed = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')

  // Handle CORS preflight before auth check
  if (request.method === 'OPTIONS' && request.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
  }

  // Check request size for POST, PUT, PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const sizeError = checkRequestSize(request)
    if (sizeError) return sizeError
  }

  // API routes handle their own auth — skip cookie-based redirect for them.
  // Bearer token callers (e.g. mobile app) would get a /login redirect instead of 401.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    const headers = corsHeaders(origin)
    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v))
    return response
  }

  const response = await updateSession(request)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
