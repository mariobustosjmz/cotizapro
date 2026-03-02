import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Health check endpoint for monitoring and load balancers
 *
 * GET /api/health
 *
 * Returns:
 * - 200 OK if all systems operational
 * - 503 Service Unavailable if any critical service is down
 */

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {}

  // Check 1: Database connection
  try {
    const supabase = await createServerClient()
    const { error } = await supabase.from('organizations').select('id').limit(1)

    if (error) {
      checks.database = { status: 'error', message: error.message }
    } else {
      checks.database = { status: 'ok' }
    }
  } catch (error) {
    checks.database = { status: 'error', message: 'Connection failed' }
  }

  // Check 2: Environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingEnvVars.length > 0) {
    checks.environment = {
      status: 'error',
      message: `Missing: ${missingEnvVars.join(', ')}`
    }
  } else {
    checks.environment = { status: 'ok' }
  }

  // Determine overall status
  const allOk = Object.values(checks).every(check => check.status === 'ok')
  const statusCode = allOk ? 200 : 503

  return NextResponse.json({
    status: allOk ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
    version: process.env.npm_package_version || '1.0.0',
  }, { status: statusCode })
}
