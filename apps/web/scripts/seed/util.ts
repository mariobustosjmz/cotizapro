import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { crc32, deflateSync } from 'zlib'

export type Admin = SupabaseClient

export function loadEnv(): { url: string; serviceKey: string; demoPassword: string } {
  dotenv.config({ path: process.env.SEED_ENV_FILE ?? path.resolve(__dirname, '../../.env.local') })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const demoPassword = process.env.SEED_DEMO_PASSWORD
  if (!url || !serviceKey) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  if (!demoPassword || demoPassword.length < 10) throw new Error('Define SEED_DEMO_PASSWORD (mínimo 10 caracteres)')
  return { url, serviceKey, demoPassword }
}

export function adminClient(url: string, serviceKey: string): Admin {
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

/** PRNG determinista (mulberry32) para que cada corrida del seed produzca los mismos datos. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Rand {
  readonly next: () => number
  readonly int: (min: number, max: number) => number
  readonly pick: <T>(items: readonly T[]) => T
  readonly chance: (p: number) => boolean
}

export function makeRand(seed: number): Rand {
  const next = rng(seed)
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)]!,
    chance: (p) => next() < p,
  }
}

export const NOW = new Date()

export function daysFromNow(days: number, hour = 10): Date {
  const d = new Date(NOW)
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function must<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`)
  if (res.data === null || res.data === undefined) throw new Error(`${what}: sin datos`)
  return res.data
}

export function check(res: { error: { message: string } | null }, what: string): void {
  if (res.error) throw new Error(`${what}: ${res.error.message}`)
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([len, body, crc])
}

/** PNG de marcador (gradiente con marco) para fotos de portafolio demo. Las fotos reales las sube el taller. */
export function placeholderPng(width: number, height: number, from: readonly [number, number, number], to: readonly [number, number, number]): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1)
    raw[row] = 0
    for (let x = 0; x < width; x++) {
      const t = (x + y) / (width + height)
      const frame = x < 24 || y < 24 || x > width - 25 || y > height - 25 || Math.abs(x - width / 2) < 6
      const i = row + 1 + x * 3
      for (let c = 0; c < 3; c++) {
        const v = Math.round(from[c]! + (to[c]! - from[c]!) * t)
        raw[i + c] = frame ? Math.round(v * 0.45) : v
      }
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}
