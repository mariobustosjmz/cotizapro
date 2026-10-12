import { test, expect, type Page } from '@playwright/test'

/**
 * Recorrido de una persona de oficio nueva: registro → configurar cuenta (persona + costura, plantilla)
 * → publicar su página → la página pública muestra sus servicios de plantilla.
 * Crea una organización nueva por corrida en la base local.
 */
const PASSWORD = 'E2E-Oficio-2026!'

async function signup(page: Page, suffix: string): Promise<void> {
  await page.goto('/signup')
  await page.locator('input[name="fullName"]').fill('Lupita Ramírez')
  await page.locator('input[name="email"]').fill(`lupita.${suffix}@e2e.cotizapro.mx`)
  await page.locator('input[name="orgName"]').fill(`Costuras Lupita ${suffix}`)
  await page.locator('input[name="password"]').fill(PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
}

test.describe('Recorrido de oficio (persona)', () => {
  test.setTimeout(120000)

  test('registro, configuración por giro, publicación y vitrina pública', async ({ page, browser }) => {
    const suffix = `${Date.now()}`
    await signup(page, suffix)

    await page.goto('/dashboard')
    await page.getByTestId('setup-banner').click()
    await expect(page).toHaveURL(/\/dashboard\/bienvenida/)
    await page.getByTestId('account-type-person').click()
    await page.getByTestId('trade-sewing').click()
    await page.getByTestId('account-setup-submit').click()
    await expect(page).toHaveURL(/\/dashboard\/vitrina/, { timeout: 30000 })

    const services = await page.request.get('/api/services')
    const body: { data?: { name: string }[]; services?: { name: string }[] } = await services.json()
    expect((body.data ?? body.services ?? []).length).toBeGreaterThan(0)

    await page.locator('#vitrina-headline').fill('Arreglos y confección a la medida')
    await page.locator('#vitrina-whatsapp_phone').fill('81 1234 5678')
    await page.getByTestId('vitrina-is_published').check()
    await page.getByTestId('vitrina-save').click()
    await expect(page.getByText('Cambios guardados')).toBeVisible()

    const url = (await page.getByTestId('vitrina-url').textContent())!.trim()
    const slug = url.split('/p/')[1]!
    const anon = await browser.newContext()
    const pub = await anon.newPage()
    await pub.goto(`/p/${slug}`)
    await expect(pub.getByText('Profesional independiente')).toBeVisible()
    await expect(pub.getByRole('heading', { level: 1 })).toHaveText(`Costuras Lupita ${suffix}`)
    await expect(pub.getByRole('heading', { name: 'Servicios' })).toBeVisible()
    await expect(pub.getByText('Calificación')).toBeVisible()
    await anon.close()

    await page.goto('/dashboard')
    await expect(page.getByTestId('setup-banner')).toHaveCount(0)
  })
})
