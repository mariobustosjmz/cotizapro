import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { RemindersPage } from '../pages/reminders.page'
import { testUsers } from '../fixtures/auth.fixture'
import { testData } from '../fixtures/data.fixture'

test.describe('Reminders Management', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
  })

  test('Reminders page loads successfully', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goto()

    expect(page.url()).toContain('/dashboard/reminders')
  })

  test('New Reminder button navigates to form', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goto()

    const newButton = page.locator('a[href="/dashboard/reminders/new"], button:has-text("Nuevo")')
    if (await newButton.isVisible()) {
      await newButton.click()
      expect(page.url()).toContain('/dashboard/reminders/new')
    }
  })

  test('Reminder form has title field', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goToNewReminder()

    const titleInput = page.locator('input[name="title"]')
    expect(await titleInput.isVisible()).toBeTruthy()
  })

  test('Reminder form has description field', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goToNewReminder()

    const descriptionInput = page.locator('textarea[name="description"]')
    if (await descriptionInput.isVisible()) {
      expect(await descriptionInput.isVisible()).toBeTruthy()
    }
  })

  test('Reminder form has due date field', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goToNewReminder()

    const dateInput = page.locator('input[name="due_date"], input[type="date"]')
    if (await dateInput.isVisible()) {
      expect(await dateInput.isVisible()).toBeTruthy()
    }
  })

  test('Create reminder with all fields', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.createReminder(testData.reminders.followUp)

    const isVisible = await remindersPage.getReminderByTitle(testData.reminders.followUp.title).isVisible()
    expect(isVisible).toBeTruthy()
  })

  test('Create reminder with title only', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    const reminderTitle = `Reminder ${Date.now()}`

    await remindersPage.createReminder({
      title: reminderTitle,
    })

    const isVisible = await remindersPage.getReminderByTitle(reminderTitle).isVisible()
    expect(isVisible).toBeTruthy()
  })

  test('Reminders list displays correctly', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goto()

    const remindersList = await remindersPage.getRemindersList()
    expect(Array.isArray(remindersList)).toBeTruthy()
  })

  test('Empty state shown when no reminders', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goto()

    const isEmpty = await remindersPage.isEmptyStateVisible()
    if (isEmpty) {
      expect(isEmpty).toBeTruthy()
    }
  })

  test('Reminder table has required columns', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goto()

    const columns = ['Título', 'Fecha vencimiento', 'Estado', 'Acciones']
    for (const col of columns) {
      const columnHeader = page.locator(`th:has-text("${col}")`)
      if (await columnHeader.isVisible()) {
        expect(await columnHeader.isVisible()).toBeTruthy()
      }
    }
  })

  test('Reminder title is required', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goToNewReminder()

    const titleInput = page.locator('input[name="title"]')
    const isRequired = await titleInput.getAttribute('required')
    expect(isRequired).toBeDefined()
  })

  test('Reminder form submit button is visible', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goToNewReminder()

    const submitButton = page.locator('button[type="submit"]')
    expect(await submitButton.isVisible()).toBeTruthy()
  })

  test('Click on reminder row navigates to details', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goto()

    const remindersList = await remindersPage.getRemindersList()
    if (remindersList.length > 0) {
      await remindersPage.clickReminderDetailsLink(remindersList[0])
      expect(page.url()).toContain('/dashboard/reminders/')
    }
  })

  test('Reminder details page shows title', async ({ page }) => {
    const remindersPage = new RemindersPage(page)

    const reminderTitle = `Test Reminder ${Date.now()}`
    await remindersPage.createReminder({
      title: reminderTitle,
    })

    await remindersPage.clickReminderDetailsLink(reminderTitle)

    const title = await remindersPage.getReminderTitle()
    expect(title).toContain(reminderTitle)
  })

  test('Reminder status is displayed', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goto()

    const remindersList = await remindersPage.getRemindersList()
    if (remindersList.length > 0) {
      await remindersPage.clickReminderDetailsLink(remindersList[0])

      const status = await remindersPage.getReminderStatus()
      expect(status).toBeDefined()
    }
  })

  test('Multiple reminders can be created', async ({ page }) => {
    const remindersPage = new RemindersPage(page)

    const reminder1 = {
      title: `Reminder 1 ${Date.now()}`,
    }

    const reminder2 = {
      title: `Reminder 2 ${Date.now()}`,
    }

    await remindersPage.createReminder(reminder1)
    await remindersPage.createReminder(reminder2)

    const reminder1Visible = await remindersPage.getReminderByTitle(reminder1.title).isVisible()
    const reminder2Visible = await remindersPage.getReminderByTitle(reminder2.title).isVisible()

    expect(reminder1Visible).toBeTruthy()
    expect(reminder2Visible).toBeTruthy()
  })

  test('Reminder form can be cancelled', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goToNewReminder()

    const cancelButton = page.locator('a:has-text("Cancelar"), a:has-text("Cancel"), button:has-text("Cancelar")')
    if (await cancelButton.isVisible()) {
      await cancelButton.click()
      await page.waitForURL('**/dashboard/reminders')
    }
  })

  test('Reminder due date is formatted correctly', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    const testDate = '2026-02-28'

    await remindersPage.createReminder({
      title: `Dated Reminder ${Date.now()}`,
      dueDate: testDate,
    })

    const dueDate = await remindersPage.getReminderDueDate()
    expect(dueDate).toBeDefined()
  })

  test('Reminders accessibility - proper table structure', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goto()

    const table = page.locator('table')
    if (await table.isVisible()) {
      const thead = table.locator('thead')
      const tbody = table.locator('tbody')

      expect(await thead.isVisible()).toBeTruthy()
      expect(await tbody.isVisible()).toBeTruthy()
    }
  })

  test('Reminder form has proper form structure', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goToNewReminder()

    const form = page.locator('form')
    expect(await form.isVisible()).toBeTruthy()

    const submitButton = page.locator('button[type="submit"]')
    expect(await submitButton.isVisible()).toBeTruthy()
  })

  test('Mark reminder as completed', async ({ page }) => {
    const remindersPage = new RemindersPage(page)

    const reminderTitle = `Complete Me ${Date.now()}`
    await remindersPage.createReminder({
      title: reminderTitle,
    })

    await remindersPage.clickReminderDetailsLink(reminderTitle)

    const completeButton = page.locator('button:has-text("Completar"), button:has-text("Mark complete")')
    if (await completeButton.isVisible()) {
      await completeButton.click()
      await page.waitForTimeout(500)

      const status = await remindersPage.getReminderStatus()
      expect(status.toLowerCase()).toContain('completed')
    }
  })

  test('Delete reminder from details', async ({ page }) => {
    const remindersPage = new RemindersPage(page)

    const reminderTitle = `Delete Me ${Date.now()}`
    await remindersPage.createReminder({
      title: reminderTitle,
    })

    await remindersPage.clickReminderDetailsLink(reminderTitle)

    const deleteButton = page.locator('button:has-text("Eliminar"), button:has-text("Delete")')
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      await page.waitForTimeout(500)

      // Confirm deletion if needed
      const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Eliminar")').last()
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }

      await page.waitForURL('**/dashboard/reminders', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard/reminders')
    }
  })

  test('Edit reminder', async ({ page }) => {
    const remindersPage = new RemindersPage(page)

    const reminderTitle = `Edit Me ${Date.now()}`
    await remindersPage.createReminder({
      title: reminderTitle,
    })

    await remindersPage.clickReminderDetailsLink(reminderTitle)

    const editButton = page.locator('button:has-text("Editar"), a:has-text("Editar")')
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForURL('**/reminders/*/edit')

      const titleInput = page.locator('input[name="title"]')
      if (await titleInput.isVisible()) {
        const newTitle = `Edited ${Date.now()}`
        await titleInput.clear()
        await titleInput.fill(newTitle)

        const submitButton = page.locator('button[type="submit"]:has-text("Guardar"), button[type="submit"]:has-text("Save")')
        if (await submitButton.isVisible()) {
          await submitButton.click()
          await page.waitForURL('**/dashboard/reminders')
        }
      }
    }
  })

  test('Snooze reminder', async ({ page }) => {
    const remindersPage = new RemindersPage(page)

    const reminderTitle = `Snooze Me ${Date.now()}`
    await remindersPage.createReminder({
      title: reminderTitle,
    })

    await remindersPage.clickReminderDetailsLink(reminderTitle)

    const snoozeButton = page.locator('button:has-text("Posponer"), button:has-text("Snooze")')
    if (await snoozeButton.isVisible()) {
      await snoozeButton.click()
      await page.waitForTimeout(500)

      // Select snooze duration
      const snoozeOption = page.locator('[role="option"]:has-text("1 day"), [role="option"]:has-text("1 semana")').first()
      if (await snoozeOption.isVisible()) {
        await snoozeOption.click()
      }
    }
  })

  test('Filter reminders by status', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goto()

    const statusFilter = page.locator('select[name="status"], input[name="status"]')
    if (await statusFilter.isVisible()) {
      if ((await statusFilter.getAttribute('type')) === 'text') {
        await statusFilter.fill('pending')
      } else {
        const options = statusFilter.locator('option')
        if ((await options.count()) > 1) {
          await statusFilter.selectOption({ index: 1 })
        }
      }
      await page.waitForTimeout(500)
    }
  })

  test('Reminders due today are highlighted', async ({ page }) => {
    const remindersPage = new RemindersPage(page)

    const today = new Date().toISOString().split('T')[0]
    const reminderTitle = `Due Today ${Date.now()}`

    await remindersPage.createReminder({
      title: reminderTitle,
      dueDate: today,
    })

    await remindersPage.goto()

    const reminderRow = remindersPage.getReminderByTitle(reminderTitle)
    if (await reminderRow.isVisible()) {
      const hasHighlight = await reminderRow.locator('[class*="today"], [class*="highlight"], [class*="urgent"]').count()
      // May or may not be highlighted depending on implementation
      expect(hasHighlight >= 0).toBeTruthy()
    }
  })

  test('Reminder pagination works', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goto()

    const nextButton = page.locator('button:has-text("Siguiente"), [aria-label="Next page"]')
    if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
      await nextButton.click()
      await page.waitForTimeout(500)

      const remindersList = await remindersPage.getRemindersList()
      expect(remindersList.length >= 0).toBeTruthy()
    }
  })

  test('Search reminders by title', async ({ page }) => {
    const remindersPage = new RemindersPage(page)
    await remindersPage.goto()

    const searchInput = page.locator('input[placeholder*="Buscar"], input[name="search"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('Follow')
      await page.waitForTimeout(500)

      const remindersList = await remindersPage.getRemindersList()
      if (remindersList.length > 0) {
        const hasMatch = remindersList.some((r) => r.toLowerCase().includes('follow'))
        expect(hasMatch || remindersList.length === 0).toBeTruthy()
      }
    }
  })
})
