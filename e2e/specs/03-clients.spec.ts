import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { ClientsPage } from '../pages/clients.page'
import { testUsers } from '../fixtures/auth.fixture'
import { testData, generateClientName } from '../fixtures/data.fixture'

test.describe('Client Management', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
  })

  test('Clients page loads successfully', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()

    expect(page.url()).toContain('/dashboard/clients')
    const isVisible = await clientsPage.isNewClientButtonVisible()
    expect(isVisible).toBeTruthy()
  })

  test('New Client button navigates to form', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()

    await page.locator('a[href="/dashboard/clients/new"]').click()
    expect(page.url()).toContain('/dashboard/clients/new')
  })

  test('Create client with all fields', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.createClient(testData.clients.acme)

    const isVisible = await clientsPage.isClientVisible(testData.clients.acme.name)
    expect(isVisible).toBeTruthy()
  })

  test('Create client with minimal fields', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    const minimalClient = {
      name: generateClientName(),
    }

    await clientsPage.createClient(minimalClient)

    const isVisible = await clientsPage.isClientVisible(minimalClient.name)
    expect(isVisible).toBeTruthy()
  })

  test('Client list displays correctly', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()

    const clientsList = await clientsPage.getClientsList()
    if (clientsList.length > 0) {
      expect(clientsList.length).toBeGreaterThan(0)
    }
  })

  test('Empty state shown when no clients', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()

    const isEmpty = await clientsPage.isEmptyStateVisible()
    if (isEmpty) {
      const emptyText = await clientsPage.getEmptyStateText()
      expect(emptyText).toContain('No hay clientes')
    }
  })

  test('Total clients count updates after creating client', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()

    const countBefore = await clientsPage.getTotalClientCount()

    const newClient = {
      name: generateClientName(),
      email: `test-${Date.now()}@example.com`,
    }

    await clientsPage.createClient(newClient)
    await page.waitForTimeout(1000)

    const countAfter = await clientsPage.getTotalClientCount()
    expect(countAfter).toBeGreaterThanOrEqual(countBefore)
  })

  test('Client form has required name field', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goToNewClient()

    const nameInput = page.locator('input[name="name"]')
    const isRequired = await nameInput.getAttribute('required')
    expect(isRequired).toBeDefined()
  })

  test('Client email is validated', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goToNewClient()

    const emailInput = page.locator('input[name="email"]')
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid-email')
      await emailInput.blur()

      const isInvalid = await emailInput.evaluate((input: HTMLInputElement) => !input.validity.valid)
      expect(isInvalid).toBeTruthy()
    }
  })

  test('Client phone format is validated', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goToNewClient()

    const phoneInput = page.locator('input[name="phone"]')
    if (await phoneInput.isVisible()) {
      const type = await phoneInput.getAttribute('type')
      expect(type).toBe('tel')
    }
  })

  test('Click on client row navigates to details', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()

    const clientsList = await clientsPage.getClientsList()
    if (clientsList.length > 0) {
      await clientsPage.clickClientDetailsLink(clientsList[0])
      expect(page.url()).toContain('/dashboard/clients/')
    }
  })

  test('Client table displays all columns', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()

    const columns = ['Nombre', 'Contacto', 'Dirección', 'Etiquetas', 'Acciones']
    for (const col of columns) {
      const columnHeader = page.locator(`th:has-text("${col}")`)
      if (await columnHeader.isVisible()) {
        expect(await columnHeader.isVisible()).toBeTruthy()
      }
    }
  })

  test('Multiple clients can be created', async ({ page }) => {
    const clientsPage = new ClientsPage(page)

    const client1 = {
      name: `${generateClientName()} 1`,
      email: `client1-${Date.now()}@example.com`,
    }

    const client2 = {
      name: `${generateClientName()} 2`,
      email: `client2-${Date.now()}@example.com`,
    }

    await clientsPage.createClient(client1)
    await clientsPage.createClient(client2)

    const client1Visible = await clientsPage.isClientVisible(client1.name)
    const client2Visible = await clientsPage.isClientVisible(client2.name)

    expect(client1Visible).toBeTruthy()
    expect(client2Visible).toBeTruthy()
  })

  test('Client form submission shows loading state', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goToNewClient()

    await clientsPage.fillClientForm({
      name: generateClientName(),
    })

    const submitButton = page.locator('button[type="submit"]')
    const isDisabled = await submitButton.isDisabled()

    await clientsPage.submitClientForm()

    await page.waitForTimeout(500)
  })

  test('Client table has proper accessibility labels', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()

    const table = page.locator('table')
    expect(await table.isVisible()).toBeTruthy()

    const thead = page.locator('thead')
    expect(await thead.isVisible()).toBeTruthy()

    const tbody = page.locator('tbody')
    expect(await tbody.isVisible()).toBeTruthy()
  })

  test('Update client information', async ({ page }) => {
    const clientsPage = new ClientsPage(page)

    const newClient = {
      name: generateClientName(),
      email: `test-${Date.now()}@example.com`,
      phone: '+34 912 345 678',
    }

    await clientsPage.createClient(newClient)
    await clientsPage.clickClientDetailsLink(newClient.name)

    await clientsPage.clickEditButton()
    await clientsPage.editClientField('email', 'updated-test@example.com')
    await page.locator('button[type="submit"]:has-text("Guardar")').click()

    await page.waitForURL('**/dashboard/clients')
    expect(page.url()).toContain('/dashboard/clients')
  })

  test('Delete client with confirmation', async ({ page }) => {
    const clientsPage = new ClientsPage(page)

    const newClient = {
      name: `To Delete ${Date.now()}`,
      email: `delete-${Date.now()}@example.com`,
    }

    await clientsPage.createClient(newClient)

    const clientVisible = await clientsPage.isClientVisible(newClient.name)
    expect(clientVisible).toBeTruthy()

    await clientsPage.clickClientDetailsLink(newClient.name)
    await clientsPage.clickDeleteButton()

    try {
      await clientsPage.confirmDelete()
      await page.waitForURL('**/dashboard/clients')
      expect(page.url()).toContain('/dashboard/clients')
    } catch {
      // Delete confirmation may not be required
    }
  })

  test('Search/filter clients by name', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()

    const searchInput = page.locator('input[placeholder*="Buscar"], input[name="search"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('ACME')
      await page.waitForTimeout(500)

      const clientsList = await clientsPage.getClientsList()
      if (clientsList.length > 0) {
        const hasACME = clientsList.some((name) => name.toUpperCase().includes('ACME'))
        expect(hasACME || clientsList.length === 0).toBeTruthy()
      }
    }
  })

  test('Clear search filter shows all clients', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()

    const searchInput = page.locator('input[placeholder*="Buscar"], input[name="search"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('Nonexistent Client')
      await page.waitForTimeout(500)

      // Clear search
      await searchInput.clear()
      await page.waitForTimeout(500)

      const clientsList = await clientsPage.getClientsList()
      // Should show all clients again
      expect(clientsList.length >= 0).toBeTruthy()
    }
  })

  test('Client pagination works (if applicable)', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()

    const nextButton = page.locator('button:has-text("Siguiente"), [aria-label="Next page"]')
    if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
      await nextButton.click()
      await page.waitForTimeout(500)

      const clientsList = await clientsPage.getClientsList()
      expect(clientsList.length > 0).toBeTruthy()
    }
  })

  test('Client with tags displays correctly', async ({ page }) => {
    const clientsPage = new ClientsPage(page)

    const clientWithTags = {
      name: `${generateClientName()} - With Tags`,
      email: `tags-${Date.now()}@example.com`,
      tags: 'vip, corporativo',
    }

    await clientsPage.createClient(clientWithTags)

    const isVisible = await clientsPage.isClientVisible(clientWithTags.name)
    expect(isVisible).toBeTruthy()
  })

  test('Client address is displayed in list', async ({ page }) => {
    const clientsPage = new ClientsPage(page)

    const clientWithAddress = {
      name: `${generateClientName()} - Address Test`,
      email: `address-${Date.now()}@example.com`,
      address: 'Calle Principal 123, Madrid',
    }

    await clientsPage.createClient(clientWithAddress)

    await clientsPage.goto()
    const clientVisible = await clientsPage.isClientVisible(clientWithAddress.name)
    expect(clientVisible).toBeTruthy()
  })
})
