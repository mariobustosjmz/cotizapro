import Link from 'next/link'

export function QuestionLink({ href }: { readonly href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
    >
      Tengo dudas
    </a>
  )
}

export function TermsSection({ terms }: { readonly terms: string }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Términos y condiciones</h2>
      <p className="text-sm text-gray-600 whitespace-pre-line">{terms}</p>
    </section>
  )
}

export function PublicQuoteFooter({ token }: { readonly token: string }) {
  return (
    <footer className="text-center space-y-2 py-4">
      <a href={`/api/public/quotes/${token}/pdf`} className="text-sm font-semibold text-[var(--brand-on-light)] hover:underline">
        Descargar PDF
      </a>
      <p className="text-xs text-gray-400">
        Cotización enviada con{' '}
        <Link href="/" className="font-semibold text-orange-600 hover:underline">CotizaPro</Link>
      </p>
    </footer>
  )
}
