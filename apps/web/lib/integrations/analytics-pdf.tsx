import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  title: { fontSize: 20, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 12, textAlign: 'center', marginBottom: 4 },
  period: { fontSize: 10, textAlign: 'center', marginBottom: 20, color: '#555' },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  table: { marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#2563EB' },
  tableHeaderCell: { flex: 1, padding: 6, fontSize: 10, color: '#fff', fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableRowAlt: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableCell: { flex: 1, padding: 6, fontSize: 10 },
  conversionText: { fontSize: 12, marginBottom: 20 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#888' },
})

type Row = [string, string]

interface AnalyticsPDFData {
  orgName: string
  startDateStr: string
  summary: Row[]
  statusRows: Row[]
  conversionRate: string
}

function AnalyticsDocument({ orgName, startDateStr, summary, statusRows, conversionRate }: AnalyticsPDFData) {
  const today = new Date().toLocaleDateString('es-MX')
  const from = new Date(startDateStr).toLocaleDateString('es-MX')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Reporte de Analíticas</Text>
        <Text style={styles.subtitle}>{orgName}</Text>
        <Text style={styles.period}>Período: {from} - {today}</Text>

        <Text style={styles.sectionTitle}>Resumen General</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Métrica</Text>
            <Text style={styles.tableHeaderCell}>Valor</Text>
          </View>
          {summary.map(([label, value], i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.tableCell}>{label}</Text>
              <Text style={styles.tableCell}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Estado de Cotizaciones (en período)</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Estado</Text>
            <Text style={styles.tableHeaderCell}>Cantidad</Text>
          </View>
          {statusRows.map(([label, value], i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.tableCell}>{label}</Text>
              <Text style={styles.tableCell}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.conversionText}>Tasa de Conversión: {conversionRate}%</Text>

        <Text style={styles.footer}>
          Generado el {new Date().toLocaleString('es-MX')} — CotizaPro Sistema de Gestión de Cotizaciones
        </Text>
      </Page>
    </Document>
  )
}

export async function generateAnalyticsPDF(data: AnalyticsPDFData): Promise<Buffer> {
  return renderToBuffer(<AnalyticsDocument {...data} />)
}
