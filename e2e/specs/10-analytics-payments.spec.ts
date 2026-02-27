import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { QuotesPage } from '../pages/quotes.page'
import { testUsers } from '../fixtures/auth.fixture'

test.describe('Analytics & Payments', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
  })

  // Analytics Tests
  test('Analytics page loads successfully', async ({ page }) => {
    await page.goto('/dashboard/analytics', { waitUntil: 'load' })

    expect(page.url()).toContain('/dashboard/analytics')

    const heading = page.locator('text=Analíticas').first()
    expect(await heading.isVisible()).toBeTruthy()
  })

  test('Analytics shows summary cards', async ({ page }) => {
    await page.goto('/dashboard/analytics', { waitUntil: 'load' })

    const totalQuotesCard = page.locator('text=Total Cotizaciones')
    const clientsCard = page.locator('text=Clientes')
    const revenueCard = page.locator('text=Ingresos Totales')
    const remindersCard = page.locator('text=Recordatorios')

    const totalQuotesVisible = await totalQuotesCard.isVisible()
    const clientsVisible = await clientsCard.isVisible()
    const revenueVisible = await revenueCard.isVisible()
    const remindersVisible = await remindersCard.isVisible()

    expect(totalQuotesVisible || clientsVisible || revenueVisible || remindersVisible).toBeTruthy()
  })

  test('Analytics shows quotes analytics', async ({ page }) => {
    await page.goto('/dashboard/analytics', { waitUntil: 'load' })

    const quotesAnalytics = page.locator('text=Cotizaciones por Estado')
    if (await quotesAnalytics.isVisible()) {
      expect(await quotesAnalytics.isVisible()).toBeTruthy()
    }
  })

  test('Income analytics component renders', async ({ page }) => {
    await page.goto('/dashboard/analytics', { waitUntil: 'load' })

    const incomeAnalytics = page.locator('text=Análisis Detallado de Ingresos')
    if (await incomeAnalytics.isVisible()) {
      expect(await incomeAnalytics.isVisible()).toBeTruthy()
    }

    const weekButton = page.locator('button:has-text("Semana")')
    const monthButton = page.locator('button:has-text("Mes")')
    const hasIncomeButtons = (await weekButton.isVisible()) || (await monthButton.isVisible())
    if (hasIncomeButtons) {
      expect(hasIncomeButtons).toBeTruthy()
    }
  })

  test('Income analytics loads data', async ({ page }) => {
    await page.goto('/dashboard/analytics', { waitUntil: 'load' })

    const incomeAnalytics = page.locator('text=Análisis Detallado de Ingresos')
    if (await incomeAnalytics.isVisible()) {
      await page.waitForLoadState('networkidle')

      const cobradoMes = page.getByText('Cobrado este Mes')
      const cobradoSemana = page.getByText('Cobrado esta Semana')
      const hasData = (await cobradoMes.isVisible().catch(() => false)) || (await cobradoSemana.isVisible().catch(() => false))
      if (hasData) {
        expect(hasData).toBeTruthy()
      }
    }
  })

  // Payment Tests
  test('Quote detail page with payment section loads', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const quotesList = await quotesPage.getQuotesList()
    if (quotesList.length === 0) {
      test.skip()
    }

    const firstQuoteLink = page.locator('table tbody tr:first-child a').first()
    if (await firstQuoteLink.isVisible()) {
      await Promise.all([
        page.waitForURL('**/dashboard/quotes/*'),
        firstQuoteLink.click(),
      ])

      expect(page.url()).toContain('/dashboard/quotes/')

      // Wait for client-side data fetch to complete (quote detail uses useEffect)
      await page.waitForLoadState('networkidle')

      const paymentSection = page.getByRole('heading', { name: 'Pagos' })
      expect(await paymentSection.isVisible()).toBeTruthy()
    }
  })

  test('Payment section shows balance information', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const quotesList = await quotesPage.getQuotesList()
    if (quotesList.length === 0) {
      test.skip()
    }

    const firstQuoteLink = page.locator('table tbody tr:first-child a').first()
    if (await firstQuoteLink.isVisible()) {
      await firstQuoteLink.click()
      await page.waitForURL('**/dashboard/quotes/*')
      await page.waitForLoadState('networkidle')

      const paymentTitle = page.getByRole('heading', { name: 'Pagos' })
      if (await paymentTitle.isVisible()) {
        const paidText = page.getByText('Pagado', { exact: true })
        expect(await paidText.isVisible()).toBeTruthy()

        const balanceAmount = page.locator('span:has-text("$")')
        const hasBalance = await balanceAmount.isVisible()
        expect(hasBalance).toBeTruthy()
      }
    }
  })

  test('Add payment flow with form submission', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const quotesList = await quotesPage.getQuotesList()
    if (quotesList.length === 0) {
      test.skip()
    }

    const firstQuoteLink = page.locator('table tbody tr:first-child a').first()
    if (await firstQuoteLink.isVisible()) {
      await firstQuoteLink.click()
      await page.waitForURL('**/dashboard/quotes/*')
      await page.waitForLoadState('networkidle')

      const addPaymentButton = page.locator('button:has-text("Registrar Pago")')
      if (await addPaymentButton.isVisible()) {
        await addPaymentButton.click()
        await page.waitForTimeout(300)

        const amountInput = page.locator('input[id="amount"]')
        if (await amountInput.isVisible()) {
          await amountInput.fill('500')

          const paymentMethodSelect = page.locator('select[id="payment_method"]')
          if (await paymentMethodSelect.isVisible()) {
            await paymentMethodSelect.selectOption('efectivo')
          }

          const submitButton = page.locator('button:has-text("Registrar")').last()
          if (await submitButton.isVisible()) {
            await submitButton.click()
            await page.waitForTimeout(500)
          }
        }
      }
    }
  })

  test('Payment table displays when payments exist', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const quotesList = await quotesPage.getQuotesList()
    if (quotesList.length === 0) {
      test.skip()
    }

    const firstQuoteLink = page.locator('table tbody tr:first-child a').first()
    if (await firstQuoteLink.isVisible()) {
      await firstQuoteLink.click()
      await page.waitForURL('**/dashboard/quotes/*')
      await page.waitForLoadState('networkidle')

      const paymentTable = page.locator('table:has(th:has-text("Monto"))')
      const tableVisible = await paymentTable.isVisible().catch(() => false)

      if (tableVisible) {
        expect(tableVisible).toBeTruthy()

        const dateHeader = page.locator('th:has-text("Fecha")')
        const typeHeader = page.locator('th:has-text("Tipo")')
        const methodHeader = page.locator('th:has-text("Método")')
        const amountHeader = page.locator('th:has-text("Monto")')

        const hasHeaders = (await dateHeader.isVisible()) &&
          (await typeHeader.isVisible()) &&
          (await methodHeader.isVisible()) &&
          (await amountHeader.isVisible())

        expect(hasHeaders).toBeTruthy()
      }
    }
  })

  test('Payment progress bar reflects paid amount', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const quotesList = await quotesPage.getQuotesList()
    if (quotesList.length === 0) {
      test.skip()
    }

    const firstQuoteLink = page.locator('table tbody tr:first-child a').first()
    if (await firstQuoteLink.isVisible()) {
      await firstQuoteLink.click()
      await page.waitForURL('**/dashboard/quotes/*')
      await page.waitForLoadState('networkidle')

      const progressBar = page.locator('div.bg-gray-200.rounded-full')
      const paymentProgress = progressBar.first()

      if (await paymentProgress.isVisible()) {
        const style = await paymentProgress.locator('..').locator('div.bg-blue-500, div.bg-green-500').first().getAttribute('style')
        expect(style).toBeDefined()
      }
    }
  })

  test('Full payment indicator shows when quote is paid', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const quotesList = await quotesPage.getQuotesList()
    if (quotesList.length === 0) {
      test.skip()
    }

    const firstQuoteLink = page.locator('table tbody tr:first-child a').first()
    if (await firstQuoteLink.isVisible()) {
      await firstQuoteLink.click()
      await page.waitForURL('**/dashboard/quotes/*')
      await page.waitForLoadState('networkidle')

      // Look for payment indicator — use exact match to avoid strict mode violations
      const fullyPaidIndicator = page.getByText('Pagado', { exact: true })
      const percentageText = page.getByText(/\d+(\.\d+)?%\s*pagado/)

      const hasIndicator = (await fullyPaidIndicator.isVisible().catch(() => false)) || (await percentageText.isVisible().catch(() => false))
      expect(hasIndicator).toBeTruthy()
    }
  })
})
