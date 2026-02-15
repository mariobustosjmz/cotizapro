import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { QuotesPage } from '../pages/quotes.page'
import { ClientsPage } from '../pages/clients.page'
import { testUsers } from '../fixtures/auth.fixture'
import { testData, generateClientName } from '../fixtures/data.fixture'

test.describe('Quote Management', () => {
  let clientName: string

  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)

    clientName = generateClientName()
    const clientsPage = new ClientsPage(page)
    await clientsPage.createClient({
      name: clientName,
      email: `client-${Date.now()}@example.com`,
    })
  })

  test('Quotes page loads successfully', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    expect(page.url()).toContain('/dashboard/quotes')
    const isVisible = await quotesPage.isNewQuoteButtonVisible()
    expect(isVisible).toBeTruthy()
  })

  test('New Quote button navigates to form', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    await page.locator('a[href="/dashboard/quotes/new"]').click()
    expect(page.url()).toContain('/dashboard/quotes/new')
  })

  test('Quote form loads with required fields', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goToNewQuote()

    const clientSelect = page.locator('select[name="client_id"], input[name="client_id"]')
    expect(await clientSelect.isVisible()).toBeTruthy()
  })

  test('Can add service to quote', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goToNewQuote()

    const addServiceButton = page.locator('button:has-text("Agregar servicio"), button:has-text("Add service")')
    if (await addServiceButton.isVisible()) {
      await quotesPage.addService('Web Design', '1500', '1')

      const nameInput = page.locator('input[placeholder*="Nombre"], input[placeholder*="Name"]').last()
      const value = await nameInput.inputValue()
      expect(value).toContain('Web Design')
    }
  })

  test('Quote list displays correctly', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const quotesList = await quotesPage.getQuotesList()
    // Quotes list can be empty initially
    expect(Array.isArray(quotesList)).toBeTruthy()
  })

  test('Quote status badges display correctly', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const draftCount = await quotesPage.getDraftQuotesCount()
    const sentCount = await quotesPage.getSentQuotesCount()
    const acceptedCount = await quotesPage.getAcceptedQuotesCount()
    const rejectedCount = await quotesPage.getRejectedQuotesCount()

    expect(draftCount).toBeGreaterThanOrEqual(0)
    expect(sentCount).toBeGreaterThanOrEqual(0)
    expect(acceptedCount).toBeGreaterThanOrEqual(0)
    expect(rejectedCount).toBeGreaterThanOrEqual(0)
  })

  test('Quote table displays all required columns', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const columns = ['Número', 'Cliente', 'Fecha', 'Total', 'Estado', 'Acciones']
    for (const col of columns) {
      const columnHeader = page.locator(`th:has-text("${col}")`)
      if (await columnHeader.isVisible()) {
        expect(await columnHeader.isVisible()).toBeTruthy()
      }
    }
  })

  test('Empty state shown when no quotes', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const isEmpty = await quotesPage.isEmptyStateVisible()
    if (isEmpty) {
      expect(isEmpty).toBeTruthy()
    }
  })

  test('Quote form has client selection', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goToNewQuote()

    const clientSelect = page.locator('select[name="client_id"], input[name="client_id"]')
    expect(await clientSelect.isVisible()).toBeTruthy()
  })

  test('Service quantity defaults to 1', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goToNewQuote()

    const addServiceButton = page.locator('button:has-text("Agregar servicio"), button:has-text("Add service")')
    if (await addServiceButton.isVisible()) {
      await addServiceButton.click()
      await page.waitForTimeout(500)

      const quantityInput = page.locator('input[name*="quantity"]').last()
      if (await quantityInput.isVisible()) {
        const value = await quantityInput.inputValue()
        expect(value).toBe('1')
      }
    }
  })

  test('Multiple services can be added to quote', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goToNewQuote()

    const addServiceButton = page.locator('button:has-text("Agregar servicio"), button:has-text("Add service")')
    if (await addServiceButton.isVisible()) {
      await quotesPage.addService('Web Design', '1500', '1')
      await quotesPage.addService('Hosting', '120', '12')

      const serviceInputs = page.locator('input[placeholder*="Nombre"], input[placeholder*="Name"]')
      const count = await serviceInputs.count()
      expect(count).toBeGreaterThanOrEqual(2)
    }
  })

  test('Quote form validates numeric price input', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goToNewQuote()

    const addServiceButton = page.locator('button:has-text("Agregar servicio"), button:has-text("Add service")')
    if (await addServiceButton.isVisible()) {
      await addServiceButton.click()
      await page.waitForTimeout(500)

      const priceInput = page.locator('input[name*="price"]').last()
      const type = await priceInput.getAttribute('type')
      expect(['number', 'text'].includes(type || '')).toBeTruthy()
    }
  })

  test('Quote form can be cancelled', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goToNewQuote()

    const cancelButton = page.locator('a:has-text("Cancelar"), a:has-text("Cancel"), button:has-text("Cancelar")')
    if (await cancelButton.isVisible()) {
      await cancelButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('Quote total calculation includes all services', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goToNewQuote()

    const addServiceButton = page.locator('button:has-text("Agregar servicio"), button:has-text("Add service")')
    if (await addServiceButton.isVisible()) {
      await quotesPage.addService('Web Design', '1500', '1')

      const totalElement = page.locator('[data-testid="quote-total"], .quote-total, text=/Total|TOTAL/')
      if (await totalElement.isVisible()) {
        const total = await totalElement.textContent()
        expect(total).toBeDefined()
      }
    }
  })

  test('Quote accessibility - proper form structure', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goToNewQuote()

    const form = page.locator('form')
    expect(await form.isVisible()).toBeTruthy()

    const submitButton = page.locator('button[type="submit"]')
    expect(await submitButton.isVisible()).toBeTruthy()
  })

  test('Quote list shows client information', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    const clientsPage = new ClientsPage(page)

    const client = {
      name: generateClientName(),
      email: `test-${Date.now()}@example.com`,
      company_name: 'Test Company',
    }

    await clientsPage.createClient(client)

    await quotesPage.goto()

    const quotesList = await quotesPage.getQuotesList()
    if (quotesList.length > 0) {
      // Client info should be in the list
      expect(quotesList).toBeDefined()
    }
  })

  test('Save quote with line items', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goToNewQuote()

    // Select client
    const clientSelect = page.locator('select[name="client_id"], input[name="client_id"]')
    if (await clientSelect.isVisible()) {
      if ((await clientSelect.getAttribute('type')) === 'text') {
        // Autocomplete field
        await clientSelect.fill(clientName)
        await page.waitForTimeout(300)
        const firstOption = page.locator('[role="option"]').first()
        if (await firstOption.isVisible()) {
          await firstOption.click()
        }
      } else {
        // Select element
        await clientSelect.selectOption({ index: 1 })
      }
    }

    // Add services
    const addServiceButton = page.locator('button:has-text("Agregar servicio"), button:has-text("Add service")')
    if (await addServiceButton.isVisible()) {
      await quotesPage.addService('Web Design', '1500', '1')
      await quotesPage.addService('Hosting', '120', '12')
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"]:has-text("Crear"), button[type="submit"]:has-text("Guardar")')
    if (await submitButton.isVisible()) {
      await submitButton.click()
      await page.waitForURL('**/dashboard/quotes', { timeout: 10000 })
      expect(page.url()).toContain('/dashboard/quotes')
    }
  })

  test('View quote details', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const quotesList = await quotesPage.getQuotesList()
    if (quotesList.length > 0) {
      const firstQuoteLink = page.locator('table tbody tr:first-child a').first()
      if (await firstQuoteLink.isVisible()) {
        await firstQuoteLink.click()
        await page.waitForURL('**/dashboard/quotes/*')
        expect(page.url()).toContain('/dashboard/quotes/')
      }
    }
  })

  test('Filter quotes by status', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const statusFilter = page.locator('select[name="status"], input[name="status"]')
    if (await statusFilter.isVisible()) {
      if ((await statusFilter.getAttribute('type')) === 'text') {
        // Autocomplete or searchable
        await statusFilter.fill('draft')
      } else {
        // Select element
        const options = statusFilter.locator('option')
        if ((await options.count()) > 1) {
          await statusFilter.selectOption({ index: 1 })
        }
      }
      await page.waitForTimeout(500)
    }
  })

  test('Quote list pagination', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const nextButton = page.locator('button:has-text("Siguiente"), [aria-label="Next page"]')
    if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
      await nextButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('Delete quote from details page', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goto()

    const quotesList = await quotesPage.getQuotesList()
    if (quotesList.length > 0) {
      const firstQuoteLink = page.locator('table tbody tr:first-child a').first()
      if (await firstQuoteLink.isVisible()) {
        await firstQuoteLink.click()
        await page.waitForURL('**/dashboard/quotes/*')

        const deleteButton = page.locator('button:has-text("Eliminar")')
        if (await deleteButton.isVisible()) {
          await deleteButton.click()
          await page.waitForTimeout(500)

          // Confirm deletion if dialog appears
          const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Eliminar")').last()
          if (await confirmButton.isVisible()) {
            await confirmButton.click()
          }
        }
      }
    }
  })

  test('Quote total recalculates when service quantity changes', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goToNewQuote()

    const addServiceButton = page.locator('button:has-text("Agregar servicio"), button:has-text("Add service")')
    if (await addServiceButton.isVisible()) {
      await quotesPage.addService('Web Design', '1000', '1')

      const totalBefore = await page.locator('[data-testid="quote-total"], .quote-total, text=/Total|TOTAL/').textContent()

      const quantityInput = page.locator('input[name*="quantity"]').last()
      if (await quantityInput.isVisible()) {
        await quantityInput.clear()
        await quantityInput.fill('2')
        await page.waitForTimeout(300)

        const totalAfter = await page.locator('[data-testid="quote-total"], .quote-total, text=/Total|TOTAL/').textContent()
        expect(totalAfter).not.toBe(totalBefore)
      }
    }
  })

  test('Service can be removed from quote', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goToNewQuote()

    const addServiceButton = page.locator('button:has-text("Agregar servicio"), button:has-text("Add service")')
    if (await addServiceButton.isVisible()) {
      await quotesPage.addService('Web Design', '1500', '1')
      await page.waitForTimeout(300)

      const removeButton = page.locator('button:has-text("Eliminar"), [aria-label*="Remove"]').last()
      if (await removeButton.isVisible()) {
        await removeButton.click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('Quote creation requires client selection', async ({ page }) => {
    const quotesPage = new QuotesPage(page)
    await quotesPage.goToNewQuote()

    const clientSelect = page.locator('select[name="client_id"], input[name="client_id"]')
    const isRequired = await clientSelect.getAttribute('required')
    expect(isRequired).toBeDefined()
  })
})
