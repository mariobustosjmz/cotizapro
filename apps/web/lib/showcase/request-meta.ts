import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { extractClientIp } from '@/lib/rate-limit'

/** Hash de IP con sal: permite limitar abuso sin guardar la IP en claro. */
export function hashClientIp(request: NextRequest): string {
  const salt = process.env.IP_HASH_SALT ?? 'cotizapro-local-salt'
  return createHash('sha256').update(`${salt}:${extractClientIp(request)}`).digest('hex')
}
