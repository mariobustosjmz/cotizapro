import { test, expect } from '@playwright/test'
import { demoAccessToken } from '../helpers/demo-auth'

// Requiere el seed demo (pnpm seed): megaglass-demo publicado con fotos y reseñas.
const SLUG = 'megaglass-demo'

test.describe('Vitrina pública', () => {
  test('muestra encabezado, estadísticas, servicios, portafolio y reseñas verificadas sin sesión', async ({ page }) => {
    await page.goto(`/p/${SLUG}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('MEGAGLASS')
    await expect(page.getByText('Trabajos realizados').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Servicios' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Reseñas verificadas/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pedir cotización' })).toHaveAttribute('href', '#pedir-cotizacion')
    await expect(page.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', /^https:\/\/wa\.me\/\d+\?text=/)
  })

  test('las fotos del portafolio cargan (CSP permite el origen de Supabase)', async ({ page }) => {
    await page.goto(`/p/${SLUG}`)
    const images = page.locator('figure img')
    await expect(images.first()).toBeVisible()
    await images.first().scrollIntoViewIfNeeded()
    await expect.poll(() => images.first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  })

  test('valida el formulario de solicitud antes de enviar', async ({ page }) => {
    await page.goto(`/p/${SLUG}`)
    await page.locator('#qr-name').fill('Cliente Prueba')
    await page.locator('#qr-phone').fill('123')
    await page.locator('#qr-message').fill('Necesito un espejo para baño')
    await page.getByRole('button', { name: 'Enviar solicitud' }).click()
    await expect(page.getByText('Teléfono de 10 dígitos')).toBeVisible()
    await expect(page.locator('#qr-phone')).toHaveClass(/border-red-500/)
  })

  test('un slug inexistente responde 404', async ({ page }) => {
    const res = await page.goto('/p/no-existe-esta-pagina')
    expect(res?.status()).toBe(404)
  })

  test('el honeypot responde éxito falso al bot y no registra la solicitud', async ({ request }) => {
    const name = `Bot ${Date.now()}`
    const res = await request.post('/api/public/quote-requests', {
      data: { slug: SLUG, name, phone: '8111111111', message: 'spam spam spam', website: 'http://spam' },
    })
    expect(res.status()).toBe(201)
    const token = await demoAccessToken('direccion@megaglass.demo.cotizapro.mx')
    const list = await request.get('/api/quote-requests', { headers: { Authorization: `Bearer ${token}` } })
    const body: { data: { name: string }[] } = await list.json()
    expect(body.data.some((r) => r.name === name)).toBe(false)
  })
})
