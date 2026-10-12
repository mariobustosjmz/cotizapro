import { test, expect, type Page } from '@playwright/test'

/**
 * Batería anónima contra producción. Solo escribe solicitudes de cotización en cuentas demo
 * (se regeneran a diario). Requiere PROD_API_URL y PROD_ANON_KEY (la anon key es pública).
 */
const API = process.env.PROD_API_URL ?? 'https://api.cotizapro.mariobustos.io'
const ANON = process.env.PROD_ANON_KEY ?? ''
const APP_ORIGIN = 'https://cotizapro.mariobustos.io'

const DEMOS = [
  { slug: 'megaglass-demo', name: 'MEGAGLASS', label: 'Empresa' },
  { slug: 'cuadrilla-voltaje', name: 'Cuadrilla Voltaje', label: 'Equipo de trabajo' },
  { slug: 'plomeria-don-beto', name: 'Don Beto Plomero', label: 'Profesional independiente' },
  { slug: 'costuras-lupita', name: 'Costuras Lupita', label: 'Profesional independiente' },
] as const

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

test.describe('Vitrinas públicas en producción', () => {
  for (const demo of DEMOS) {
    test(`${demo.slug}: encabezado, tipo de cuenta, servicios, reseñas y CTA sin errores`, async ({ page }) => {
      const errors = collectErrors(page)
      const res = await page.goto(`/p/${demo.slug}`)
      expect(res?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(demo.name)
      await expect(page.getByText(demo.label, { exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Servicios' })).toBeVisible()
      await expect(page.getByRole('heading', { name: /Reseñas verificadas \(\d+\)/ })).toBeVisible()
      await expect(page.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', /^https:\/\/wa\.me\/52\d{10}\?text=/)
      await expect(page).toHaveTitle(new RegExp(demo.name))
      expect(errors, errors.join('\n')).toEqual([])
    })
  }

  test('todas las fotos del portafolio cargan', async ({ page }) => {
    await page.goto('/p/megaglass-demo')
    const imgs = page.locator('figure img')
    const count = await imgs.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const img = imgs.nth(i)
      await img.scrollIntoViewIfNeeded()
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { timeout: 15000 }).toBe(true)
    }
  })

  test('en móvil no hay desbordamiento horizontal', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true })
    const page = await ctx.newPage()
    await page.goto('/p/costuras-lupita')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await ctx.close()
  })

  test('slug inexistente responde 404', async ({ page }) => {
    expect((await page.goto('/p/no-existe-esta-pagina'))?.status()).toBe(404)
  })
})

test.describe('Solicitud de cotización real (cuenta demo)', () => {
  test('validación de campos y envío exitoso desde la página', async ({ page }) => {
    await page.goto('/p/plomeria-don-beto')
    await page.getByRole('button', { name: 'Enviar solicitud' }).click()
    await expect(page.getByText('Escribe tu nombre')).toBeVisible()

    await page.locator('#qr-name').fill('Prueba Producción QA')
    await page.locator('#qr-phone').fill('81 5555 0101')
    await page.locator('#qr-message').fill('Fuga en el calentador, necesito revisión esta semana. (Prueba automatizada QA)')
    await page.locator('#qr-measurements').fill('Calentador de 40 L').catch(() => undefined)
    await page.getByRole('button', { name: 'Enviar solicitud' }).click()
    await expect(page.getByTestId('quote-request-sent')).toBeVisible()
  })

  test('el honeypot responde éxito falso', async ({ request }) => {
    const res = await request.post('/api/public/quote-requests', {
      data: { slug: 'plomeria-don-beto', name: 'Bot', phone: '8111111111', message: 'spam spam spam', website: 'http://spam' },
    })
    expect(res.status()).toBe(201)
  })

  test('solicitud a slug inexistente se rechaza sin filtrar detalles', async ({ request }) => {
    const res = await request.post('/api/public/quote-requests', {
      data: { slug: 'no-existe-esta-pagina', name: 'Cliente', phone: '8111111111', message: 'Necesito cotización', website: '' },
    })
    expect(res.status()).toBe(404)
    expect(await res.text()).not.toMatch(/sql|postgres|stack/i)
  })
})

test.describe('Reseñas: ligas inválidas', () => {
  test('una liga con token inexistente no permite calificar', async ({ page, request }) => {
    const token = 'a'.repeat(48)
    const res = await page.goto(`/r/${token}`)
    expect([200, 404]).toContain(res?.status())
    await expect(page.getByRole('radiogroup')).toHaveCount(0)
    const api = await request.post('/api/public/reviews', { data: { token, rating: 5 } })
    expect(api.status()).toBeGreaterThanOrEqual(400)
  })
})

test.describe('Seguridad de la app', () => {
  test('cabeceras de seguridad presentes', async ({ request }) => {
    const res = await request.get('/')
    const h = res.headers()
    expect(h['strict-transport-security']).toContain('max-age=31536000')
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['x-frame-options']).toBe('DENY')
    expect(h['content-security-policy']).toContain(new URL(API).origin)
    expect(h['server']).toBeUndefined()
  })

  test('rutas privadas redirigen a login y las APIs piden sesión', async ({ page, request }) => {
    for (const path of ['/dashboard', '/dashboard/vitrina', '/dashboard/quotes/new']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/)
    }
    for (const path of ['/api/quotes', '/api/clients', '/api/price-lists', '/api/quote-requests', '/api/showcase/profile']) {
      expect((await request.get(path)).status(), path).toBe(401)
    }
  })

  test('el cron rechaza llamadas sin secreto o con secreto falso', async ({ request }) => {
    expect((await request.get('/api/cron/reminders-check')).status()).toBe(401)
    const fake = await request.get('/api/cron/reminders-check', { headers: { Authorization: `Bearer ${'x'.repeat(48)}` } })
    expect(fake.status()).toBe(401)
  })
})

test.describe('Seguridad de la API de datos', () => {
  test.skip(!ANON, 'requiere PROD_ANON_KEY')
  const headers = () => ({ apikey: ANON, Authorization: `Bearer ${ANON}` })

  test('la anon key no lee datos de ninguna tabla', async ({ request }) => {
    for (const table of ['organizations', 'profiles', 'clients', 'quotes', 'quote_items', 'quote_payments', 'public_profiles', 'reviews', 'quote_requests', 'price_lists', 'service_catalog', 'job_photos']) {
      const res = await request.get(`${API}/rest/v1/${table}?select=*&limit=1`, { headers: headers() })
      const body = await res.text()
      expect(res.status() === 200 ? body : '[]', table).toBe('[]')
    }
  })

  test('la anon key no puede escribir', async ({ request }) => {
    const res = await request.post(`${API}/rest/v1/quote_requests`, { headers: headers(), data: { name: 'x' } })
    expect(res.status()).toBeGreaterThanOrEqual(401)
  })

  test('funciones privadas negadas y la pública disponible', async ({ request }) => {
    const priv = await request.post(`${API}/rest/v1/rpc/create_review_request`, { headers: headers(), data: { p_quote_id: '00000000-0000-0000-0000-000000000000' } })
    expect(priv.status()).toBeGreaterThanOrEqual(401)
    const pub = await request.post(`${API}/rest/v1/rpc/get_public_profile`, { headers: headers(), data: { p_slug: 'megaglass-demo' } })
    expect(pub.status()).toBe(200)
    const json: { profile?: { display_name?: string } } = await pub.json()
    expect(json.profile?.display_name).toBe('MEGAGLASS')
  })

  test('Storage solo expone las fotos publicadas en vitrinas', async ({ request }) => {
    const list = async (prefix: string): Promise<{ name: string; id: string | null }[]> => {
      const res = await request.post(`${API}/storage/v1/object/list/job-photos`, { headers: headers(), data: { prefix, limit: 1000 } })
      return res.status() === 200 ? res.json() : []
    }
    const visible: string[] = []
    for (const org of await list('')) {
      for (const quote of await list(`${org.name}/`)) {
        for (const file of await list(`${org.name}/${quote.name}/`)) visible.push(`${org.name}/${quote.name}/${file.name}`)
      }
    }
    const published = new Set<string>()
    for (const demo of DEMOS) {
      const res = await request.post(`${API}/rest/v1/rpc/get_public_profile`, { headers: headers(), data: { p_slug: demo.slug } })
      const body: { photos?: { path: string }[] } = await res.json()
      for (const photo of body.photos ?? []) published.add(photo.path)
    }
    expect(visible.length).toBeGreaterThan(0)
    expect(visible.filter((path) => !published.has(path)), 'fotos visibles que no están publicadas').toEqual([])
    const unsigned = await request.get(`${API}/storage/v1/object/public/job-photos/${visible[0]}`)
    expect(unsigned.status()).toBeGreaterThanOrEqual(400)
  })

  test('CORS solo autoriza el origen de la app', async ({ request }) => {
    const pre = (origin: string) =>
      request.fetch(`${API}/auth/v1/token`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } })
    expect((await pre(APP_ORIGIN)).headers()['access-control-allow-origin']).toBe(APP_ORIGIN)
    expect((await pre('https://evil.example')).headers()['access-control-allow-origin']).not.toBe('https://evil.example')
  })

  test('login con credenciales falsas responde error genérico', async ({ request }) => {
    const res = await request.post(`${API}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      data: { email: 'noexiste@example.com', password: 'incorrecta-123' },
    })
    expect(res.status()).toBe(400)
    expect(await res.text()).toMatch(/invalid/i)
  })
})

test.describe('Rendimiento', () => {
  for (const path of ['/', '/login', '/p/megaglass-demo']) {
    test(`${path} responde en menos de 1.5 s y comprimido`, async ({ request }) => {
      const started = Date.now()
      const res = await request.get(path, { headers: { 'Accept-Encoding': 'gzip, zstd' } })
      const elapsed = Date.now() - started
      expect(res.status()).toBe(200)
      expect(elapsed, `${path} tardó ${elapsed} ms`).toBeLessThan(1500)
    })
  }

  test('los recursos estáticos se sirven con caché inmutable', async ({ page }) => {
    const statics: string[] = []
    page.on('response', (r) => {
      if (r.url().includes('/_next/static/')) statics.push(r.headers()['cache-control'] ?? '')
    })
    await page.goto('/p/megaglass-demo')
    await page.waitForLoadState('networkidle')
    expect(statics.length).toBeGreaterThan(0)
    expect(statics.every((c) => c.includes('immutable')), statics.join(' | ')).toBe(true)
  })

  test('métricas de carga de la vitrina (LCP y DOM listo)', async ({ page }) => {
    await page.goto('/p/megaglass-demo', { waitUntil: 'load' })
    const metrics = await page.evaluate(
      () =>
        new Promise<{ lcp: number; domReady: number }>((resolve) => {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            resolve({ lcp: entries[entries.length - 1]!.startTime, domReady: nav.domContentLoadedEventEnd })
          }).observe({ type: 'largest-contentful-paint', buffered: true })
        }),
    )
    test.info().annotations.push({ type: 'métricas', description: `LCP ${Math.round(metrics.lcp)} ms · DOM listo ${Math.round(metrics.domReady)} ms` })
    expect(metrics.lcp).toBeLessThan(2500)
  })
})
