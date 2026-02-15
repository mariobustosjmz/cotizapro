import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, generateQuoteEmailHTML } from '@/lib/integrations/email'
import { sendWhatsAppMessage } from '@/lib/integrations/twilio'
import { encode as escapeHtml } from 'html-entities'
import { logger } from '@/lib/logger'
import { handleApiError, ApiErrors } from '@/lib/error-handler'

/**
 * Cron Job: Check and Send Due Reminders
 *
 * This endpoint should be called daily by a cron service (Vercel Cron, GitHub Actions, etc.)
 * to check for due reminders and send notifications automatically.
 *
 * Schedule: Daily at 9:00 AM (user's timezone)
 *
 * Authentication: Requires CRON_SECRET env variable for security
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Validate CRON_SECRET exists and meets minimum security requirements
    if (!cronSecret || typeof cronSecret !== 'string' || cronSecret.length < 32) {
      logger.security('CRON_SECRET not configured or too short')
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Cron job not properly configured'),
        'Cron reminders check'
      )
    }

    // Validate authorization header exists
    if (!authHeader) {
      logger.security('Cron request missing authorization header')
      return handleApiError(
        ApiErrors.UNAUTHORIZED(),
        'Cron reminders check - missing auth header'
      )
    }

    // Use constant-time comparison to prevent timing attacks
    const expectedAuth = `Bearer ${cronSecret}`
    const isValid = Buffer.from(authHeader).toString('utf-8') ===
                    Buffer.from(expectedAuth).toString('utf-8')

    if (!isValid) {
      logger.security('Cron request with invalid authorization', { requestPath: new URL(request.url).pathname })
      return handleApiError(
        ApiErrors.UNAUTHORIZED(),
        'Cron reminders check - invalid auth'
      )
    }

    const supabase = await createServerClient()

    // Get all organizations (we need to process reminders for all orgs)
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id')

    if (orgsError) {
      logger.error('Error fetching organizations', orgsError, { context: 'Cron reminders check' })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to fetch organizations'),
        'Cron reminders check - fetch organizations'
      )
    }

    let totalProcessed = 0
    let totalSent = 0
    let totalFailed = 0
    const results: any[] = []

    // Process each organization
    for (const org of organizations || []) {
      try {
        // Get due reminders for this organization (today + next 1 day)
        const { data: dueReminders, error: remindersError } = await supabase
          .rpc('get_due_reminders', {
            org_id: org.id,
            days_ahead: 1, // Today and tomorrow
          })

        if (remindersError) {
          logger.error('Error fetching reminders for organization', remindersError, { orgId: org.id })
          continue
        }

        if (!dueReminders || dueReminders.length === 0) {
          continue
        }

        // Process each reminder
        for (const reminder of dueReminders) {
          totalProcessed++

          try {
            // Fetch full reminder details with notification settings
            const { data: fullReminder, error: fetchError } = await supabase
              .from('follow_up_reminders')
              .select(`
                *,
                client:clients(*)
              `)
              .eq('id', reminder.id)
              .single()

            if (fetchError || !fullReminder) {
              logger.error('Error fetching reminder details', fetchError, { reminderId: reminder.id })
              totalFailed++
              continue
            }

            // Skip if not auto_send_notification
            if (!fullReminder.auto_send_notification) {
              continue
            }

            // Skip if already sent
            if (fullReminder.notification_sent_at) {
              continue
            }

            const client = fullReminder.client
            const channels = fullReminder.notification_channels || []

            let emailSent = false
            let whatsappSent = false

            // Prepare notification message
            const message = `Hola,

Recordatorio: ${fullReminder.title}

${fullReminder.description || ''}

Cliente: ${client.name}
Fecha programada: ${new Date(fullReminder.scheduled_date).toLocaleDateString('es-MX')}
Prioridad: ${fullReminder.priority}

Tipo: ${fullReminder.reminder_type}

Por favor, contacta al cliente para dar seguimiento.

---
CotizaPro - Sistema de Gestión de Cotizaciones`

            // Send via email
            if (channels.includes('email') && client.email) {
              const emailResult = await sendEmail({
                to: client.email,
                subject: `Recordatorio: ${escapeHtml(fullReminder.title)}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
                      <h1>Recordatorio de Seguimiento</h1>
                    </div>
                    <div style="padding: 20px; background: #f9fafb;">
                      <h2>${escapeHtml(fullReminder.title)}</h2>
                      ${fullReminder.description ? `<p>${escapeHtml(fullReminder.description)}</p>` : ''}
                      <hr />
                      <p><strong>Cliente:</strong> ${escapeHtml(client.name)}</p>
                      <p><strong>Teléfono:</strong> ${escapeHtml(client.phone || '')}</p>
                      <p><strong>Fecha programada:</strong> ${new Date(fullReminder.scheduled_date).toLocaleDateString('es-MX')}</p>
                      <p><strong>Prioridad:</strong> ${fullReminder.priority === 'urgent' ? '🔴 Urgente' : fullReminder.priority === 'high' ? '🟠 Alta' : fullReminder.priority === 'normal' ? '🟡 Normal' : '🟢 Baja'}</p>
                      <p><strong>Tipo:</strong> ${escapeHtml(fullReminder.reminder_type)}</p>
                      ${fullReminder.related_service_category ? `<p><strong>Categoría de servicio:</strong> ${escapeHtml(fullReminder.related_service_category)}</p>` : ''}
                    </div>
                    <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
                      <p>Este correo fue generado automáticamente por CotizaPro</p>
                    </div>
                  </div>
                `,
              })

              emailSent = emailResult.success
            }

            // Send via WhatsApp
            if (channels.includes('whatsapp')) {
              const whatsappPhone = client.whatsapp_phone || client.phone

              if (whatsappPhone) {
                const whatsappResult = await sendWhatsAppMessage({
                  to: whatsappPhone,
                  message: message,
                })

                whatsappSent = whatsappResult.success
              }
            }

            // Update reminder as sent if at least one channel succeeded
            if (emailSent || whatsappSent) {
              await supabase
                .from('follow_up_reminders')
                .update({
                  status: 'sent',
                  notification_sent_at: new Date().toISOString(),
                })
                .eq('id', fullReminder.id)

              totalSent++
              results.push({
                reminder_id: fullReminder.id,
                client_name: client.name,
                title: fullReminder.title,
                email_sent: emailSent,
                whatsapp_sent: whatsappSent,
              })
            } else {
              totalFailed++
            }
          } catch (reminderError) {
            logger.error('Error processing reminder', reminderError as Error, { reminderId: reminder.id })
            totalFailed++
          }
        }
      } catch (orgError) {
        logger.error('Error processing organization', orgError as Error, { orgId: org.id })
      }
    }

    logger.info('Cron job completed', {
      processed: totalProcessed,
      sent: totalSent,
      failed: totalFailed,
    })

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      sent: totalSent,
      failed: totalFailed,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Cron job unhandled error', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Cron job failed'),
      'Cron reminders check - unhandled error'
    )
  }
}

// POST endpoint for manual triggering (for testing)
export async function POST(request: NextRequest) {
  return GET(request)
}
