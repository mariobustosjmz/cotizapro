import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
} from '@react-pdf/renderer'
import { createStyles, DEFAULT_BRAND_COLOR } from './pdf-styles'
import type { QuoteWithItems } from '@/types/database.types'

export interface OrgSettings {
  company_address?: string
  company_phone?: string
  company_email?: string
  logo_url?: string
  brand_color?: string
}

interface QuotePDFProps {
  quote: QuoteWithItems
  orgName: string
  orgSettings: OrgSettings
}

function BuildingIconFallback() {
  // Simple text-based fallback since SVG might have limitations
  return (
    <Text style={{ fontSize: 20, color: 'white' }}>🏢</Text>
  )
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function QuotePDF({ quote, orgName, orgSettings }: QuotePDFProps) {
  const brandColor = orgSettings.brand_color ?? DEFAULT_BRAND_COLOR
  const styles = createStyles(brandColor)

  const companyLines = [
    orgSettings.company_address,
    orgSettings.company_phone,
    orgSettings.company_email,
  ].filter((line): line is string => Boolean(line))

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header band */}
        <View style={styles.headerBand}>
          {orgSettings.logo_url ? (
            <Image
              src={orgSettings.logo_url}
              style={styles.logoImage}
            />
          ) : (
            <View style={styles.logoIconContainer}>
              <BuildingIconFallback />
            </View>
          )}
          <View style={styles.headerCompanyBlock}>
            <Text style={styles.headerCompanyName}>{orgName}</Text>
            {companyLines.map((line, i) => (
              <Text key={i} style={styles.headerCompanyDetail}>{line}</Text>
            ))}
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Quote meta + client */}
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Cotizacion</Text>
              <Text style={styles.metaValue}>#{quote.quote_number}</Text>
              <Text style={styles.metaValueSub}>Fecha: {formatDate(quote.created_at)}</Text>
              <Text style={styles.metaValueSub}>Valida hasta: {formatDate(quote.valid_until)}</Text>
            </View>
            <View style={styles.clientBlock}>
              <Text style={styles.metaLabel}>Cliente</Text>
              <Text style={styles.clientName}>{quote.client.name}</Text>
              {quote.client.email && (
                <Text style={styles.clientDetail}>{quote.client.email}</Text>
              )}
              {quote.client.phone && (
                <Text style={styles.clientDetail}>{quote.client.phone}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Items table */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Descripcion</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Cant.</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unidad</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio Unit.</Text>
            <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>Subtotal</Text>
          </View>

          {quote.items.map((item, index) => (
            <View
              key={item.id}
              style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
            >
              <Text style={[styles.tableCell, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colUnit]}>{item.unit_type}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{formatCurrency(Number(item.unit_price))}</Text>
              <Text style={[styles.tableCell, styles.colSubtotal]}>{formatCurrency(Number(item.subtotal))}</Text>
            </View>
          ))}

          {/* Totals */}
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal:</Text>
              <Text style={styles.totalsValue}>{formatCurrency(quote.subtotal)}</Text>
            </View>
            {quote.discount_amount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Descuento ({quote.discount_rate}%):</Text>
                <Text style={styles.totalsValue}>-{formatCurrency(quote.discount_amount)}</Text>
              </View>
            )}
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IVA ({quote.tax_rate}%):</Text>
              <Text style={styles.totalsValue}>{formatCurrency(quote.tax_amount)}</Text>
            </View>
            <View style={styles.totalFinalRow}>
              <Text style={styles.totalFinalLabel}>TOTAL:</Text>
              <Text style={styles.totalFinalValue}>{formatCurrency(quote.total)}</Text>
            </View>
          </View>

          {/* Notes */}
          {quote.notes && (
            <View style={styles.notesBlock}>
              <Text style={styles.sectionLabel}>Notas</Text>
              <Text style={styles.notesText}>{quote.notes}</Text>
            </View>
          )}

          {/* Terms */}
          {quote.terms_and_conditions && (
            <View style={styles.notesBlock}>
              <Text style={styles.sectionLabel}>Terminos y Condiciones</Text>
              <Text style={styles.notesText}>{quote.terms_and_conditions}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{orgName} — {quote.quote_number}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Pag. ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
