import { test, expect, type Page } from '@playwright/test'
import { aiAdmin, fillAiUsage, MEGAGLASS_ORG_ID, MEGAGLASS_OWNER, resetAiUsage } from '../helpers/ai-usage'
import { loginAsDemo } from '../helpers/login'

// Requiere el seed demo y AI_BASE_URL apuntando a la IA falsa (/api/dev/fake-ai/v1).
const DESCRIBED = 'Cancel de baño en vidrio templado de 9 mm con herrajes de acero inoxidable e instalación incluida.'
const REWRITTEN = 'El anticipo del 50 % se paga al aceptar y el resto al terminar la instalación.'

async function expectUsage(page: Page, text: string): Promise<void> {
  await page.goto('/dashboard/billing')
  await expect(page.getByTestId('ai-usage-card')).toContainText(text)
}

test.describe('IA: descripción, reescritura y medidor', () => {
  test.beforeAll(async () => {
    await resetAiUsage(MEGAGLASS_ORG_ID)
  })

  test.beforeEach(async ({ page }) => {
    await resetAiUsage(MEGAGLASS_ORG_ID)
    await loginAsDemo(page, MEGAGLASS_OWNER)
  })

  test.afterAll(async () => {
    await resetAiUsage(MEGAGLASS_ORG_ID)
  })

  test('mejora la descripción: la sugerencia no toca el campo hasta Usar y cobra 2 créditos', async ({ page }) => {
    await page.goto('/dashboard/quotes/new')
    const description = page.getByTestId('item-description-0').first()
    await description.fill('cancel 9mm corredizo')
    const button = page.getByTestId('ai-describe-0')
    await expect(button).toHaveText('Mejorar con IA · 2 créditos')
    await button.click()
    const suggestion = page.getByTestId('ai-describe-0-suggestion')
    await expect(suggestion).toContainText(DESCRIBED)
    await expect(suggestion).not.toContainText('Claro')
    await expect(description).toHaveValue('cancel 9mm corredizo')
    await page.getByTestId('ai-describe-0-accept').click()
    await expect(description).toHaveValue(DESCRIBED)
    await expect(suggestion).toHaveCount(0)
    await expectUsage(page, '2 de 400 créditos')
  })

  test('Descartar deja el texto original', async ({ page }) => {
    await page.goto('/dashboard/quotes/new')
    const description = page.getByTestId('item-description-0').first()
    await description.fill('cancel 9mm corredizo')
    await page.getByTestId('ai-describe-0').click()
    await expect(page.getByTestId('ai-describe-0-suggestion')).toContainText(DESCRIBED)
    await expect(page.getByTestId('ai-describe-0-accept')).toBeEnabled()
    await page.getByTestId('ai-describe-0-discard').click()
    await expect(page.getByTestId('ai-describe-0-suggestion')).toHaveCount(0)
    await expect(description).toHaveValue('cancel 9mm corredizo')
  })

  test('una falla de la IA no cobra y deja el texto intacto', async ({ page }) => {
    await page.goto('/dashboard/quotes/new')
    const description = page.getByTestId('item-description-0').first()
    await description.fill('cancel [fallo-ia]')
    await page.getByTestId('ai-describe-0').click()
    await expect(page.getByTestId('ai-describe-0-error')).toBeVisible()
    await expect(page.getByTestId('ai-describe-0-suggestion')).toHaveCount(0)
    await expect(description).toHaveValue('cancel [fallo-ia]')
    await expectUsage(page, '0 de 400 créditos')
  })

  test('reescribe los términos con Usar y cobra 1 crédito; Descartar conserva el original', async ({ page }) => {
    await page.goto('/dashboard/quotes/new')
    await page.getByTestId('quote-notes-toggle').click()
    const terms = page.getByTestId('quote-terms')
    await terms.fill('anticipo 50% y resto al final')

    await page.getByTestId('ai-rewrite-terms').click()
    await page.getByTestId('ai-rewrite-terms-polish').click()
    await expect(page.getByTestId('ai-rewrite-terms-suggestion')).toContainText(REWRITTEN)
    await expect(terms).toHaveValue('anticipo 50% y resto al final')
    await expect(page.getByTestId('ai-rewrite-terms-accept')).toBeEnabled()
    await page.getByTestId('ai-rewrite-terms-discard').click()
    await expect(terms).toHaveValue('anticipo 50% y resto al final')

    await page.getByTestId('ai-rewrite-terms').click()
    await page.getByTestId('ai-rewrite-terms-polish').click()
    await expect(page.getByTestId('ai-rewrite-terms-accept')).toBeEnabled()
    await page.getByTestId('ai-rewrite-terms-accept').click()
    await expect(terms).toHaveValue(REWRITTEN)
    await expectUsage(page, '2 de 400 créditos')
  })

  test('al 100 % el botón se desactiva y Inicio ofrece obtener más', async ({ page }) => {
    await fillAiUsage(MEGAGLASS_ORG_ID, 400)
    await page.goto('/dashboard/billing')
    await expect(page.getByTestId('ai-usage-percent')).toHaveText('100 % usado')
    await expect(page.getByTestId('ai-get-more')).toBeVisible()

    await page.goto('/dashboard/quotes/new')
    await page.getByTestId('item-description-0').first().fill('cancel 9mm')
    const button = page.getByTestId('ai-describe-0')
    await expect(button).toHaveText('Sin créditos este mes')
    await expect(button).toBeDisabled()

    await page.goto('/dashboard')
    await expect(page.getByTestId('ai-usage-banner')).toContainText('Obtener más')
  })

  test('reescribe y guarda la respuesta a una reseña', async ({ page }) => {
    await page.goto('/dashboard/vitrina')
    const reply = page.locator('textarea[data-testid^="review-reply-"]').first()
    await expect(reply).toBeVisible()
    const reviewId = (await reply.getAttribute('data-testid') ?? '').replace('review-reply-', '')
    const { data: before } = await aiAdmin().from('reviews').select('owner_reply').eq('id', reviewId).single()
    try {
      await reply.fill('gracias por confiar en nosotros, el anticipo 50%')
      await page.getByTestId(`ai-rewrite-review-${reviewId}`).click()
      await page.getByTestId(`ai-rewrite-review-${reviewId}-polish`).click()
      await expect(page.getByTestId(`ai-rewrite-review-${reviewId}-accept`)).toBeEnabled()
      await page.getByTestId(`ai-rewrite-review-${reviewId}-accept`).click()
      await expect(reply).toHaveValue(REWRITTEN)
      await page.getByTestId(`review-reply-save-${reviewId}`).click()
      await expect(page.getByText('Respuesta guardada')).toBeVisible()
      const { data: after } = await aiAdmin().from('reviews').select('owner_reply').eq('id', reviewId).single()
      expect(after?.owner_reply).toBe(REWRITTEN)
    } finally {
      await aiAdmin().from('reviews').update({ owner_reply: before?.owner_reply ?? null }).eq('id', reviewId)
    }
  })
})
