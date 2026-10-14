import { renderToBuffer } from '@react-pdf/renderer'
import { QuotePDF, type OrgSettings } from '@/lib/pdf/QuotePDF'
import type { QuotePdfData } from '@/lib/pdf/quote-pdf-types'

export type { OrgSettings }

export async function generateQuotePDF(
  quote: QuotePdfData,
  orgName: string = 'Tu Empresa',
  orgSettings: OrgSettings = {}
): Promise<Buffer> {
  const element = <QuotePDF quote={quote} orgName={orgName} orgSettings={orgSettings} />
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
