import { FullConfig } from '@playwright/test'
import { cleanTestDatabase } from './helpers/seed-database'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Running global teardown...')

  try {
    await cleanTestDatabase()
  } catch (error) {
    console.error('❌ Teardown failed:', error)
  }

  console.log(`📊 Test results available in ${config.webServer?.url || 'the app'}`)
  console.log('✅ Global teardown complete')
}

export default globalTeardown
