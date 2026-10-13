import type { When } from './tipos'

const DAY_MS = 86_400_000

/** Fecha local (componentes del reloj del servidor) desplazada `day` días desde hoy. */
export function localDate(day: number, now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + day)
}

export function ymd(day: number, now = new Date()): string {
  const d = localDate(day, now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Hora de pared sin zona, como guarda la agenda (ver lib/calendar/wall-clock.ts). Un domingo pasa al lunes. */
export function wallClock(when: When, plusHours = 0, now = new Date()): string {
  const minutes = Math.round((when.hour + plusHours) * 60)
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mm = String(minutes % 60).padStart(2, '0')
  const day = localDate(when.day, now).getDay() === 0 ? when.day + 1 : when.day
  return `${ymd(day, now)}T${hh}:${mm}:00`
}

/** Instante real (timestamptz) para fechas de creación, envío, aceptación y reseñas. */
export function instant(day: number, hour = 12, now = new Date()): string {
  const d = localDate(day, now)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString()
}
