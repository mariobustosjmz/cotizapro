import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateQuoteTemplateSchema } from '@/lib/validations/cotizapro'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'

// PATCH /api/templates/[id] - Update template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for template update', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('PATCH /api/templates/[id] - unauthorized access attempt', { templateId: id })
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'PATCH /api/templates/[id]')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'PATCH /api/templates/[id]')
    }

    // Verify template belongs to user's organization
    logger.database('SELECT', 'quote_templates', { templateId: id, orgId: profile.organization_id })
    const { data: template, error: templateError } = await supabase
      .from('quote_templates')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (templateError || !template) {
      logger.warn('Template not found or unauthorized access attempt', {
        templateId: id,
        userId: user.id,
        orgId: profile.organization_id,
      })
      return handleApiError(ApiErrors.NOT_FOUND('Template'), 'PATCH /api/templates/[id]')
    }

    const body = await request.json()
    const validation = updateQuoteTemplateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: validation.error.issues,
      }, { status: 400 })
    }

    logger.database('UPDATE', 'quote_templates', { templateId: id })
    const { data: updated, error: updateError } = await supabase
      .from('quote_templates')
      .update(validation.data)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select(
        'id, organization_id, name, description, default_items, default_terms, default_discount_rate, is_active, promotional_label, promotional_valid_until, created_at'
      )
      .single()

    if (updateError) {
      logger.error('Error updating template', updateError, { templateId: id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to update template'),
        'PATCH /api/templates/[id] - update'
      )
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    logger.error('Unexpected error in PATCH /api/templates/[id]', error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'PATCH /api/templates/[id]'
    )
  }
}

// DELETE /api/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for template deletion', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('DELETE /api/templates/[id] - unauthorized access attempt', { templateId: id })
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'DELETE /api/templates/[id]')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'DELETE /api/templates/[id]')
    }

    // Check role - only owner/admin can delete
    if (!['owner', 'admin'].includes(profile.role)) {
      logger.security('DELETE /api/templates/[id] - forbidden access', {
        userId: user.id,
        role: profile.role,
        templateId: id,
      })
      return handleApiError(ApiErrors.FORBIDDEN(), 'DELETE /api/templates/[id]')
    }

    // Verify template belongs to user's organization
    logger.database('SELECT', 'quote_templates', { templateId: id, orgId: profile.organization_id })
    const { data: template, error: templateError } = await supabase
      .from('quote_templates')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (templateError || !template) {
      logger.warn('Template not found or unauthorized access attempt', {
        templateId: id,
        userId: user.id,
        orgId: profile.organization_id,
      })
      return handleApiError(ApiErrors.NOT_FOUND('Template'), 'DELETE /api/templates/[id]')
    }

    logger.database('DELETE', 'quote_templates', { templateId: id })
    const { error: deleteError } = await supabase
      .from('quote_templates')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (deleteError) {
      logger.error('Error deleting template', deleteError, { templateId: id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to delete template'),
        'DELETE /api/templates/[id] - delete'
      )
    }

    logger.info('Template deleted successfully', { templateId: id, userId: user.id })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/templates/[id]', error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'DELETE /api/templates/[id]'
    )
  }
}
