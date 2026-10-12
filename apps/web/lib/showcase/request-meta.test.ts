import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { extractClientIp as clientIp } from '@/lib/rate-limit'
import { hashClientIp } from './request-meta'

const req = (headers: Record<string, string>) => new NextRequest('http://localhost/api/x', { headers })

describe('clientIp', () => {
  it('uses the right-most forwarded hop added by the trusted proxy', () => {
    expect(clientIp(req({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' }))).toBe('203.0.113.9')
  })
  it('falls back to x-real-ip and then unknown', () => {
    expect(clientIp(req({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4')
    expect(clientIp(req({}))).toBe('127.0.0.1')
  })
  it('spoofed left hops do not change the hash', () => {
    const a = hashClientIp(req({ 'x-forwarded-for': '9.9.9.9, 203.0.113.9' }))
    const b = hashClientIp(req({ 'x-forwarded-for': '8.8.8.8, 203.0.113.9' }))
    expect(a).toBe(b)
  })
})
