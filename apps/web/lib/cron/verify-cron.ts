import { timingSafeEqual } from 'crypto'

export const MIN_CRON_SECRET_LENGTH = 32

export type CronAuthResult =
  | { readonly ok: true; readonly secret: string }
  | { readonly ok: false; readonly status: 401 | 500; readonly reason: 'not_configured' | 'missing' | 'invalid' }

export function verifyCronAuthorization(header: string | null, secret: string | undefined): CronAuthResult {
  if (!secret || secret.length < MIN_CRON_SECRET_LENGTH) return { ok: false, status: 500, reason: 'not_configured' }
  if (!header) return { ok: false, status: 401, reason: 'missing' }
  const expected = Buffer.from(`Bearer ${secret}`, 'utf-8')
  const received = Buffer.from(header, 'utf-8')
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return { ok: false, status: 401, reason: 'invalid' }
  }
  return { ok: true, secret }
}
