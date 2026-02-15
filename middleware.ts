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

export async function middleware(request: NextRequest) {
  // Check request size for POST, PUT, PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const sizeError = checkRequestSize(request)
    if (sizeError) return sizeError
  }

  return await updateSession(request)
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
