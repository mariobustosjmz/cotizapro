export const testData = {
  clients: {
    acme: {
      name: 'ACME Corporation',
      email: 'contact@acme.com',
      phone: '+34 912 345 678',
      company_name: 'ACME Corp',
      address: 'Calle Principal 123, Madrid',
      tags: 'corporativo, cliente-frecuente',
    },
    startup: {
      name: 'Startup Inc',
      email: 'info@startup.com',
      phone: '+34 934 567 890',
      company_name: 'Startup Inc',
      address: 'Avenida Tecnología 45, Barcelona',
      tags: 'startup, tech',
    },
    freelancer: {
      name: 'Juan Garcia',
      email: 'juan@example.com',
      phone: '+34 645 123 456',
      company_name: 'Garcia Freelance',
      address: 'Calle Independencia 10, Valencia',
    },
  },

  quotes: {
    basic: {
      description: 'Diseño Web Básico',
      notes: 'Incluye 3 páginas y contacto',
    },
    premium: {
      description: 'Diseño Web Premium',
      notes: 'Incluye SEO, analytics y soporte',
    },
  },

  services: {
    webDesign: {
      name: 'Diseño Web',
      price: '1500',
      quantity: '1',
    },
    hosting: {
      name: 'Hosting',
      price: '120',
      quantity: '12',
    },
    maintenance: {
      name: 'Mantenimiento',
      price: '300',
      quantity: '1',
    },
  },

  reminders: {
    followUp: {
      title: 'Seguimiento con cliente',
      description: 'Llamar al cliente para saber si aceptó la propuesta',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    paymentDue: {
      title: 'Pago vencido',
      description: 'Recordar al cliente que debe pagar la factura',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  },
}

export function generateRandomEmail(): string {
  return `test-${Date.now()}@example.com`
}

export function generateRandomPhone(): string {
  const base = '346'
  const random = Math.floor(Math.random() * 90000000)
    .toString()
    .padStart(8, '0')
  return `+34${base}${random}`
}

export function generateClientName(): string {
  const first = ['ACME', 'Tech', 'Digital', 'Creative', 'Smart']
  const second = ['Solutions', 'Systems', 'Media', 'Labs', 'Ventures']
  return `${first[Math.floor(Math.random() * first.length)]} ${second[Math.floor(Math.random() * second.length)]}`
}

export function generateQuoteNumber(): string {
  const timestamp = Date.now().toString().slice(-6)
  return `COT-${timestamp}`
}

export function formatCurrency(amount: number, locale = 'es-MX'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}
