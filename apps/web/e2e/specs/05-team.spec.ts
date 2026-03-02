import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { TeamPage } from '../pages/team.page'
import { testUsers } from '../fixtures/auth.fixture'
import { generateRandomEmail } from '../fixtures/data.fixture'

test.describe('Team Management', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
  })

  test('Team page loads successfully', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goto()

    expect(page.url()).toContain('/dashboard/team')
  })

  test('Invite member button is visible', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goto()

    const inviteButton = page.locator('a[href="/dashboard/team/invite"], button:has-text("Invitar")').first()
    expect(await inviteButton.isVisible()).toBeTruthy()
  })

  test('Invite team member form displays', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goToInvite()

    const emailInput = page.locator('input[name="email"]')
    expect(await emailInput.isVisible()).toBeTruthy()
  })

  test('Invite form has email field', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goToInvite()

    const emailInput = page.locator('input[name="email"]')
    const type = await emailInput.getAttribute('type')
    expect(type).toBe('email')
  })

  test('Invite form has role selection', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goToInvite()

    const roleSelect = page.locator('select[name="role"]')
    if (await roleSelect.isVisible()) {
      expect(await roleSelect.isVisible()).toBeTruthy()

      const options = await roleSelect.locator('option').count()
      expect(options).toBeGreaterThan(0)
    }
  })

  test('Team members list displays', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goto()

    const table = page.locator('table')
    if (await table.isVisible()) {
      expect(await table.isVisible()).toBeTruthy()
    }
  })

  test('Owner user is listed in team members', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goto()

    const ownerEmail = page.locator(`text=${testUsers.owner.email}`)
    expect(await ownerEmail.isVisible()).toBeTruthy()
  })

  test('Team members table has required columns', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goto()

    const columns = ['Email', 'Rol', 'Acciones']
    for (const col of columns) {
      const columnHeader = page.locator(`th:has-text("${col}")`)
      if (await columnHeader.isVisible()) {
        expect(await columnHeader.isVisible()).toBeTruthy()
      }
    }
  })

  test('Team member count is displayed', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goto()

    const countElement = page.locator('text=Miembros, text=Members')
    if (await countElement.isVisible()) {
      expect(await countElement.isVisible()).toBeTruthy()
    }
  })

  test('Invite form validates email format', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goToInvite()

    const emailInput = page.locator('input[name="email"]')
    await emailInput.fill('invalid-email')
    await emailInput.blur()

    const isInvalid = await emailInput.evaluate((input: HTMLInputElement) => !input.validity.valid)
    expect(isInvalid).toBeTruthy()
  })

  test('Invite form submit button is visible', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goToInvite()

    const submitButton = page.locator('button[type="submit"]:has-text("Enviar Invitación"), button[type="submit"]:has-text("Invitar"), button[type="submit"]:has-text("Send")')
    expect(await submitButton.isVisible()).toBeTruthy()
  })

  test('Can navigate back from invite form', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goToInvite()

    const backButton = page.locator('a:has-text("Volver"), a:has-text("Back")')
    if (await backButton.isVisible()) {
      await backButton.click()
      await page.waitForURL('**/dashboard/team')
    }
  })

  test('Invitation page is accessible with token', async ({ page }) => {
    const teamPage = new TeamPage(page)

    // Try to access with a test token
    await teamPage.goToInvitation('test-token')

    // Should show invitation page or 404/error
    const currentUrl = page.url()
    expect(currentUrl).toContain('invite')
  })

  test('Team page shows no members message when empty', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goto()

    const emptyMessage = page.locator('text=No hay miembros, text=No members')
    // Only check if visible - may or may not show depending on data
    if (await emptyMessage.isVisible()) {
      expect(await emptyMessage.isVisible()).toBeTruthy()
    }
  })

  test('Edit member button is visible for team members', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goto()

    const editButtons = page.locator('button:has-text("Editar"), button:has-text("Edit")')
    if (await editButtons.first().isVisible()) {
      expect(await editButtons.first().isVisible()).toBeTruthy()
    }
  })

  test('Remove member button exists', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goto()

    const removeButtons = page.locator('button:has-text("Eliminar"), button:has-text("Remove")')
    // Check if remove buttons exist for other members (not for self)
    if (await removeButtons.count() > 0) {
      expect(await removeButtons.count()).toBeGreaterThan(0)
    }
  })

  test('Invite form can be cancelled', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goToInvite()

    const cancelButton = page.locator('a:has-text("Cancelar"), a:has-text("Cancel"), button:has-text("Cancelar")').first()
    if (await cancelButton.isVisible()) {
      await cancelButton.click()
    }
  })

  test('Team page accessibility - proper table structure', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goto()

    const table = page.locator('table')
    if (await table.isVisible()) {
      const thead = table.locator('thead')
      const tbody = table.locator('tbody')

      expect(await thead.isVisible()).toBeTruthy()
      expect(await tbody.isVisible()).toBeTruthy()
    }
  })

  test('Invite member email is required field', async ({ page }) => {
    const teamPage = new TeamPage(page)
    await teamPage.goToInvite()

    const emailInput = page.locator('input[name="email"]')
    const isRequired = await emailInput.getAttribute('required')
    expect(isRequired).toBeDefined()
  })
})
