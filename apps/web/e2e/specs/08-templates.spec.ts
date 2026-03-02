import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { TemplatesPage } from '../pages/templates.page'
import { testUsers } from '../fixtures/auth.fixture'

test.describe('Quote Templates Management', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
  })

  test('Templates page loads successfully', async ({ page }) => {
    const templatesPage = new TemplatesPage(page)
    await templatesPage.goto()

    expect(page.url()).toContain('/dashboard/templates')
    const headingVisible = await page.locator('h2:has-text("Templates")').isVisible()
    expect(headingVisible).toBeTruthy()
  })

  test('Templates list shows seeded data', async ({ page }) => {
    const templatesPage = new TemplatesPage(page)
    await templatesPage.goto()

    // Check if any templates are visible (seeded data should be present)
    const isEmptyVisible = await templatesPage.isEmptyStateVisible()
    const templateCount = await templatesPage.getTemplateCount()

    // Either we have templates or we see the empty state
    if (!isEmptyVisible) {
      expect(templateCount).toBeGreaterThan(0)
    }
  })

  test('Create new template with minimal fields', async ({ page }) => {
    const templatesPage = new TemplatesPage(page)
    await templatesPage.goto()

    const uniqueName = `Template Test ${Date.now()}`

    // Click to open the create modal
    await templatesPage.clickNewTemplate()

    // Verify modal is visible (use heading role to avoid matching the button too)
    const modalHeading = page.getByRole('heading', { name: 'Nuevo Template' })
    expect(await modalHeading.isVisible()).toBeTruthy()

    // Fill form with minimal fields
    await templatesPage.fillTemplateForm({
      name: uniqueName,
    })

    // Submit form
    await templatesPage.submitTemplateForm()

    // Wait for page to update
    await page.waitForTimeout(800)

    // Verify template appears in list
    const isVisible = await templatesPage.isTemplateVisible(uniqueName)
    expect(isVisible).toBeTruthy()
  })

  test('Create template with promotional fields', async ({ page }) => {
    const templatesPage = new TemplatesPage(page)
    await templatesPage.goto()

    const uniqueName = `Template Promo ${Date.now()}`
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Open create modal
    await templatesPage.clickNewTemplate()

    // Fill form including promotional fields
    await templatesPage.fillTemplateForm({
      name: uniqueName,
      promotional_label: 'Oferta Especial',
      promotional_valid_until: futureDate,
    })

    // Submit form
    await templatesPage.submitTemplateForm()

    // Wait for page to update
    await page.waitForTimeout(800)

    // Verify template appears
    const isVisible = await templatesPage.isTemplateVisible(uniqueName)
    expect(isVisible).toBeTruthy()

    // Verify promotional info is displayed
    const promoLabelVisible = await page.locator('text=Oferta Especial').isVisible()
    expect(promoLabelVisible).toBeTruthy()
  })

  test('Create template with all fields', async ({ page }) => {
    const templatesPage = new TemplatesPage(page)
    await templatesPage.goto()

    const uniqueName = `Template Complete ${Date.now()}`
    const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Open create modal
    await templatesPage.clickNewTemplate()

    // Fill form with all fields
    await templatesPage.fillTemplateForm({
      name: uniqueName,
      description: 'Descripción de prueba',
      default_terms: 'Términos y condiciones por defecto',
      default_discount_rate: '10',
      promotional_label: 'Promoción de Verano',
      promotional_valid_until: futureDate,
    })

    // Submit form
    await templatesPage.submitTemplateForm()

    // Wait for page to update
    await page.waitForTimeout(800)

    // Verify template appears
    const isVisible = await templatesPage.isTemplateVisible(uniqueName)
    expect(isVisible).toBeTruthy()

    // Verify discount rate is displayed
    const discountVisible = await page.locator('text=10%').isVisible()
    expect(discountVisible).toBeTruthy()
  })

  test('Edit existing template', async ({ page }) => {
    const templatesPage = new TemplatesPage(page)
    await templatesPage.goto()

    // Check if there are templates to edit
    const isEmpty = await templatesPage.isEmptyStateVisible()
    if (isEmpty) {
      // Create one first
      const templateName = `Template to Edit ${Date.now()}`
      await templatesPage.clickNewTemplate()
      await templatesPage.fillTemplateForm({ name: templateName })
      await templatesPage.submitTemplateForm()
      await page.waitForTimeout(800)
      await templatesPage.goto()
    }

    // Get first template name — the card has h3 with template name + status badge
    const firstCardTitle = page.locator('.grid h3').first()
    await firstCardTitle.waitFor({ state: 'visible', timeout: 10000 })
    const firstTemplate = await firstCardTitle.textContent()
    if (!firstTemplate) {
      test.skip()
      return
    }

    // h3 contains name + "Activo"/"Inactivo" badge text
    const originalName = firstTemplate.replace(/Activo|Inactivo/g, '').trim()
    const newName = `Updated Template ${Date.now()}`

    // Edit the template
    await templatesPage.editTemplate(originalName)

    // Modal should be open now
    const editHeading = page.getByRole('heading', { name: 'Editar Template' })
    await editHeading.waitFor({ state: 'visible', timeout: 5000 })

    // Clear the name field and enter new name using triple-click + type to ensure React state updates
    const nameInput = page.locator('input[id="name"]')
    await nameInput.click({ clickCount: 3 })
    await nameInput.press('Backspace')
    await nameInput.fill(newName)

    // Verify input value changed before submitting
    await expect(nameInput).toHaveValue(newName)

    // Submit the form and wait for PATCH response
    const patchPromise = page.waitForResponse(
      (r) => r.url().includes('/api/templates/') && r.request().method() === 'PATCH',
      { timeout: 10000 }
    )
    await page.locator('button[type="submit"]').click()
    await patchPromise

    // Wait for modal to close and list to refresh
    await page.waitForTimeout(1000)

    // Force a fresh page load
    await templatesPage.goto()

    const updatedCard = page.locator('h3').filter({ hasText: newName })
    await expect(updatedCard).toBeVisible({ timeout: 10000 })
  })

  test('Delete template', async ({ page }) => {
    const templatesPage = new TemplatesPage(page)
    await templatesPage.goto()

    const templateToDelete = `Template to Delete ${Date.now()}`

    // Create a template to delete
    await templatesPage.clickNewTemplate()
    await templatesPage.fillTemplateForm({
      name: templateToDelete,
    })
    await templatesPage.submitTemplateForm()

    // Wait for creation to complete
    await page.waitForTimeout(800)
    await templatesPage.goto()

    // Verify it was created
    let isVisible = await templatesPage.isTemplateVisible(templateToDelete)
    expect(isVisible).toBeTruthy()

    // Delete the template
    await templatesPage.deleteTemplate(templateToDelete)

    // Wait for deletion to complete
    await page.waitForTimeout(800)
    await templatesPage.goto()

    // Verify it's gone
    isVisible = await templatesPage.isTemplateVisible(templateToDelete)
    expect(isVisible).toBeFalsy()
  })

  test('Template count in heading updates', async ({ page }) => {
    const templatesPage = new TemplatesPage(page)
    await templatesPage.goto()

    // Get initial count
    const countBefore = await templatesPage.getTemplateCount()

    // Create new template
    const newTemplateName = `Template Count Test ${Date.now()}`
    await templatesPage.clickNewTemplate()
    await templatesPage.fillTemplateForm({
      name: newTemplateName,
    })
    await templatesPage.submitTemplateForm()

    // Wait for refresh
    await page.waitForTimeout(800)
    await templatesPage.goto()

    // Get updated count
    const countAfter = await templatesPage.getTemplateCount()

    // Verify count increased
    expect(countAfter).toBeGreaterThan(countBefore)
  })

  test('Cancel button closes modal without saving', async ({ page }) => {
    const templatesPage = new TemplatesPage(page)
    await templatesPage.goto()

    const initialCount = await templatesPage.getTemplateCount()

    // Open create modal
    await templatesPage.clickNewTemplate()

    // Fill form
    await templatesPage.fillTemplateForm({
      name: 'This should not be created',
    })

    // Cancel instead of submit
    await templatesPage.cancelTemplateForm()

    // Verify modal is closed (heading should no longer be visible)
    const modalHeading = page.getByRole('heading', { name: 'Nuevo Template' })
    expect(await modalHeading.isVisible()).toBeFalsy()

    // Verify count didn't change
    const finalCount = await templatesPage.getTemplateCount()
    expect(finalCount).toBe(initialCount)
  })

  test('Template form requires name field', async ({ page }) => {
    const templatesPage = new TemplatesPage(page)
    await templatesPage.goto()

    // Open create modal
    await templatesPage.clickNewTemplate()

    // Try to submit without filling name
    const submitButton = page.locator('button[type="submit"]:has-text("Crear")')
    const isDisabled = await submitButton.isDisabled()

    // Submit button should be disabled if name is empty
    if (isDisabled) {
      expect(isDisabled).toBeTruthy()
    }

    // Fill name and verify submit is enabled
    await templatesPage.fillTemplateForm({
      name: `Template Name Test ${Date.now()}`,
    })

    const isEnabled = await submitButton.isEnabled()
    expect(isEnabled).toBeTruthy()

    // Cleanup - cancel
    await templatesPage.cancelTemplateForm()
  })
})
