import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { QuotePDF, type OrgSettings } from '@/lib/pdf/QuotePDF'
import type { QuoteWithItems } from '@/types/database.types'

export type { OrgSettings }

export async function generateQuotePDF(
  quote: QuoteWithItems,
  orgName: string = 'Tu Empresa',
  orgSettings: OrgSettings = {}
): Promise<Buffer> {
  const element = React.createElement(QuotePDF, { quote, orgName, orgSettings })
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
