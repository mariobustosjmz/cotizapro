import { StyleSheet } from '@react-pdf/renderer'
import type { BrandPalette } from '@/lib/branding/types'

export function createStyles(palette: BrandPalette) {
  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#111827',
      backgroundColor: '#FFFFFF',
    },
    headerBand: {
      backgroundColor: palette.color,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    logoFrame: {
      width: 56,
      height: 56,
      padding: 4,
      marginRight: 14,
      borderRadius: 6,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoImage: {
      width: 48,
      height: 48,
      objectFit: 'contain',
    },
    logoIconContainer: {
      width: 48,
      height: 48,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    headerCompanyBlock: {
      flex: 1,
    },
    headerCompanyName: {
      fontSize: 16,
      fontFamily: 'Helvetica-Bold',
      color: palette.ink,
    },
    headerCompanyDetail: {
      fontSize: 8,
      color: palette.ink,
      opacity: 0.85,
      marginTop: 2,
    },
    body: {
      padding: 20,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    metaLabel: {
      fontSize: 8,
      color: '#6B7280',
      textTransform: 'uppercase',
    },
    metaValue: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
      marginTop: 2,
    },
    metaValueSub: {
      fontSize: 9,
      color: '#374151',
      marginTop: 1,
    },
    sectionLabel: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: '#6B7280',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    clientBlock: {
      marginBottom: 20,
    },
    clientName: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    clientDetail: {
      fontSize: 9,
      color: '#374151',
      marginTop: 2,
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      marginBottom: 12,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: palette.color,
      padding: 8,
      marginBottom: 1,
    },
    tableHeaderCell: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: palette.ink,
    },
    tableRow: {
      flexDirection: 'row',
      padding: 5,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    tableRowAlt: {
      backgroundColor: '#F9FAFB',
    },
    tableCell: {
      fontSize: 9,
      color: '#374151',
    },
    colDesc: { flex: 4 },
    colQty: { flex: 1, textAlign: 'right' },
    colUnit: { flex: 1.5, textAlign: 'center' },
    colPrice: { flex: 2, textAlign: 'right' },
    colSubtotal: { flex: 2, textAlign: 'right' },
    totalsBlock: {
      marginTop: 12,
      alignItems: 'flex-end',
    },
    materialRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: 280,
      borderBottomWidth: 0.5,
      borderBottomColor: '#E5E7EB',
      paddingVertical: 2,
    },
    materialQty: {
      textAlign: 'right',
    },
    totalsRow: {
      flexDirection: 'row',
      marginBottom: 3,
    },
    totalsLabel: {
      fontSize: 9,
      color: '#6B7280',
      width: 80,
      textAlign: 'right',
      marginRight: 40,
    },
    totalsValue: {
      fontSize: 9,
      color: '#111827',
      width: 80,
      textAlign: 'right',
    },
    totalFinalRow: {
      flexDirection: 'row',
      backgroundColor: palette.color,
      padding: 8,
      marginTop: 4,
    },
    totalFinalLabel: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: palette.ink,
      width: 80,
      textAlign: 'right',
      marginRight: 40,
    },
    totalFinalValue: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: palette.ink,
      width: 80,
      textAlign: 'right',
    },
    notesBlock: {
      marginTop: 20,
    },
    notesText: {
      fontSize: 9,
      color: '#374151',
      lineHeight: 1.5,
    },
    footer: {
      position: 'absolute',
      bottom: 16,
      left: 24,
      right: 24,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    footerText: {
      fontSize: 8,
      color: '#9CA3AF',
    },
  })
}
