'use client'

import { useState } from 'react'
import Image from 'next/image'

interface GalleryShot {
  readonly id: string
  readonly tab: string
  readonly title: string
  readonly caption: string
  readonly src: string
  readonly width: number
  readonly height: number
  readonly frame: 'desktop' | 'phone' | 'document'
}

const SHOTS: readonly GalleryShot[] = [
  { id: 'inicio', tab: 'Panel', title: 'Tu negocio de un vistazo', caption: 'Cotizaciones por estado, ingresos aceptados y recordatorios pendientes en una sola pantalla.', src: '/landing/inicio.jpg', width: 1920, height: 1200, frame: 'desktop' },
  { id: 'cotizacion', tab: 'Cotización', title: 'Partidas con medidas y pagos', caption: 'Precio por medida, opciones y acabados; descuento e IVA automáticos y el avance de cobro en la misma cotización.', src: '/landing/cotizacion.jpg', width: 1920, height: 1200, frame: 'desktop' },
  { id: 'pdf', tab: 'PDF', title: 'PDF con tu logo y tus colores', caption: 'Folio, vigencia, lista de materiales y tus términos. Listo para mandar o imprimir.', src: '/landing/pdf.jpg', width: 1100, height: 1556, frame: 'document' },
  { id: 'correo', tab: 'Correo', title: 'Correo con tu marca', caption: 'Sale a nombre de tu negocio con el PDF adjunto; cuando el cliente responde, te llega a tu correo.', src: '/landing/correo.jpg', width: 1280, height: 1280, frame: 'document' },
  { id: 'tablero', tab: 'Tablero', title: 'Cada trabajo en su etapa', caption: 'De enviada a cobrada: mueve tus cotizaciones y ve qué falta por cerrar o cobrar.', src: '/landing/tablero.jpg', width: 2580, height: 1290, frame: 'desktop' },
  { id: 'vitrina', tab: 'Tu página', title: 'Tu página pública', caption: 'Reseñas verificadas de clientes que sí pagaron, botón para pedir cotización y WhatsApp. Compártela con un QR.', src: '/landing/vitrina-movil.jpg', width: 780, height: 1688, frame: 'phone' },
  { id: 'equipo', tab: 'Equipo', title: 'Trabaja en equipo', caption: 'Invita por WhatsApp y asigna rol: propietario, administrador, miembro o solo lectura.', src: '/landing/equipo.jpg', width: 1920, height: 1200, frame: 'desktop' },
]

const FRAME_CLASSES: Readonly<Record<GalleryShot['frame'], string>> = {
  desktop: 'w-full rounded-xl border border-slate-200 shadow-2xl',
  document: 'mx-auto max-h-[560px] w-auto rounded-lg border border-slate-200 shadow-2xl object-contain object-top',
  phone: 'mx-auto max-h-[560px] w-auto rounded-[2rem] border-8 border-slate-900 shadow-2xl object-cover object-top',
}

export function ProductGallery() {
  const [activeId, setActiveId] = useState<string>(SHOTS[0].id)
  const active = SHOTS.find((shot) => shot.id === activeId) ?? SHOTS[0]

  return (
    <section id="como-se-ve" className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Así se ve CotizaPro</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Pantallas reales del sistema con una cuenta de ejemplo de un taller de vidrio y aluminio.
          </p>
        </div>

        <div role="tablist" aria-label="Pantallas de CotizaPro" className="flex gap-2 overflow-x-auto pb-2 mb-8 sm:justify-center">
          {SHOTS.map((shot) => (
            <button
              key={shot.id}
              type="button"
              role="tab"
              id={`tab-${shot.id}`}
              aria-selected={shot.id === active.id}
              aria-controls="galeria-panel"
              onClick={() => setActiveId(shot.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                shot.id === active.id ? 'bg-blue-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {shot.tab}
            </button>
          ))}
        </div>

        <div id="galeria-panel" role="tabpanel" aria-labelledby={`tab-${active.id}`} className="grid lg:grid-cols-[1fr_2fr] gap-8 items-center">
          <div className="order-2 lg:order-1">
            <h3 className="text-2xl font-black text-slate-900 mb-3">{active.title}</h3>
            <p className="text-slate-600 leading-relaxed">{active.caption}</p>
          </div>
          <div className="order-1 lg:order-2">
            <Image
              key={active.id}
              src={active.src}
              alt={`${active.title}: pantalla real de CotizaPro`}
              width={active.width}
              height={active.height}
              sizes="(min-width: 1024px) 720px, 100vw"
              className={FRAME_CLASSES[active.frame]}
              priority={active.id === SHOTS[0].id}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
