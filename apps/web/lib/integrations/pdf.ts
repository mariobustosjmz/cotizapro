import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { QuoteWithItems } from '@/types/database.types'

// Extend jsPDF types for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number
    }
  }
}

export async function generateQuotePDF(quote: QuoteWithItems): Promise<Buffer> {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text('COTIZACIÓN', 105, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.text(`No. ${quote.quote_number}`, 105, 28, { align: 'center' })

  // Company info (placeholder - should come from organization settings)
  doc.setFontSize(9)
  doc.text('Tu Empresa', 20, 45)
  doc.text('Dirección de tu empresa', 20, 50)
  doc.text('Tel: (555) 123-4567', 20, 55)

  // Client info
  doc.text('CLIENTE:', 120, 45)
  doc.text(quote.client.name, 120, 50)
  if (quote.client.phone) {
    doc.text(`Tel: ${quote.client.phone}`, 120, 55)
  }
  if (quote.client.email) {
    doc.text(quote.client.email, 120, 60)
  }

  // Date and validity
  doc.text(`Fecha: ${new Date(quote.created_at).toLocaleDateString('es-MX')}`, 20, 70)
  doc.text(`Válida hasta: ${new Date(quote.valid_until).toLocaleDateString('es-MX')}`, 20, 75)

  // Items table
  const tableData = quote.items.map(item => [
    item.description,
    item.quantity.toString(),
    item.unit_type,
    `$${item.unit_price.toFixed(2)}`,
    `$${item.subtotal.toFixed(2)}`,
  ])

  // Build footer rows
  const footerRows: string[][] = [
    ['', '', '', 'Subtotal:', `$${quote.subtotal.toFixed(2)}`],
  ]

  if (quote.discount_amount > 0) {
    footerRows.push(['', '', '', `Descuento (${quote.discount_rate}%):`, `-$${quote.discount_amount.toFixed(2)}`])
  }

  footerRows.push(
    ['', '', '', `IVA (${quote.tax_rate}%):`, `$${quote.tax_amount.toFixed(2)}`],
    ['', '', '', 'TOTAL:', `$${quote.total.toFixed(2)}`]
  )

  autoTable(doc, {
    startY: 85,
    head: [['Descripción', 'Cantidad', 'Unidad', 'Precio Unit.', 'Subtotal']],
    body: tableData,
    foot: footerRows,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
  })

  // Notes
  if (quote.notes) {
    const finalY = doc.lastAutoTable.finalY || 85
    doc.setFontSize(10)
    doc.text('Notas:', 20, finalY + 15)
    doc.setFontSize(9)
    const splitNotes = doc.splitTextToSize(quote.notes, 170)
    doc.text(splitNotes, 20, finalY + 22)
  }

  // Terms and conditions
  if (quote.terms_and_conditions) {
    const finalY = doc.lastAutoTable.finalY || 85
    const notesHeight = quote.notes ? 30 : 0
    doc.setFontSize(8)
    doc.text('Términos y Condiciones:', 20, finalY + 15 + notesHeight)
    const splitTerms = doc.splitTextToSize(quote.terms_and_conditions, 170)
    doc.text(splitTerms, 20, finalY + 20 + notesHeight)
  }

  // Convert to buffer
  const pdfBlob = doc.output('arraybuffer')
  return Buffer.from(pdfBlob)
}
