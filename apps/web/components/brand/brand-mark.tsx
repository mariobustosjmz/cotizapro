import Image from 'next/image'

/** Marca de CotizaPro (app/icon.svg): hoja de cotización con sello de aprobada. */
export function BrandMark({ size = 32, className = '' }: { readonly size?: number; readonly className?: string }) {
  return <Image src="/icon.svg" width={size} height={size} alt="" aria-hidden="true" unoptimized className={`shrink-0 ${className}`} />
}
