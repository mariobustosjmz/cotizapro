import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'

export interface QrCardData {
  readonly displayName: string
  readonly headline: string | null
  readonly url: string
  readonly qrPng: string
  readonly whatsapp: string | null
}

const styles = StyleSheet.create({
  page: { padding: 24, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  card: { borderWidth: 1, borderColor: '#f97316', borderRadius: 10, padding: 18, alignItems: 'center' },
  name: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111827', textAlign: 'center' },
  headline: { fontSize: 10, color: '#4b5563', marginTop: 4, textAlign: 'center' },
  qr: { width: 170, height: 170, marginTop: 14 },
  cta: { fontSize: 10, color: '#111827', marginTop: 10, textAlign: 'center' },
  url: { fontSize: 8, color: '#ea580c', marginTop: 4, textAlign: 'center' },
  phone: { fontSize: 9, color: '#374151', marginTop: 6 },
  foot: { fontSize: 7, color: '#9ca3af', marginTop: 10 },
})

function QrCardDocument({ data }: { readonly data: QrCardData }) {
  const card = (
    <View style={styles.card}>
      <Text style={styles.name}>{data.displayName}</Text>
      {data.headline ? <Text style={styles.headline}>{data.headline}</Text> : null}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt */}
      <Image src={data.qrPng} style={styles.qr} />
      <Text style={styles.cta}>Escanea para ver trabajos, reseñas y pedir cotización</Text>
      <Text style={styles.url}>{data.url}</Text>
      {data.whatsapp ? <Text style={styles.phone}>WhatsApp: {data.whatsapp}</Text> : null}
      <Text style={styles.foot}>Hecho con CotizaPro</Text>
    </View>
  )
  return (
    <Document title={`Tarjeta QR - ${data.displayName}`}>
      <Page size={[288, 432]} style={styles.page}>
        {card}
      </Page>
    </Document>
  )
}

export async function renderQrCard(data: QrCardData): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<QrCardDocument data={data} />))
}
