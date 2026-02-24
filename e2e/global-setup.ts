import { chromium, FullConfig } from '@playwright/test'
import { seedTestDatabase, cleanTestDatabase } from './helpers/seed-database'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Running global setup...')

  // Clean any existing test data first (idempotent setup)
  try {
    await cleanTestDatabase()
  } catch (error) {
    console.warn('⚠️  Database cleanup failed (may be expected if no test data exists):', error)
  }

  // Seed test database
  try {
    await seedTestDatabase()
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    throw error
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Wait for the app to be ready
    const baseURL = 'http://localhost:3000'
    await page.goto(baseURL, { waitUntil: 'load', timeout: 30000 })
    console.log('✅ Application is ready')
  } catch (error) {
    console.warn('⚠️  App startup check failed (may be expected):', error)
  } finally {
    await browser.close()
  }

  console.log('✅ Global setup complete')
}

export default globalSetup
