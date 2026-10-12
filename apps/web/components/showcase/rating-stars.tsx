import { Star } from 'lucide-react'

interface RatingStarsProps {
  readonly value: number
  readonly size?: 'sm' | 'md'
}

/** Fracción de relleno de la estrella n, redondeada a medias (4.5 → cuatro llenas y una a la mitad). */
export function starFill(value: number, n: number): number {
  const halves = Math.round(value * 2) / 2
  return Math.min(1, Math.max(0, halves - (n - 1)))
}

export function RatingStars({ value, size = 'sm' }: RatingStarsProps) {
  const dim = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`relative inline-block ${dim}`} aria-hidden>
          <Star className={`${dim} text-gray-300 dark:text-gray-600`} />
          <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${starFill(value, n) * 100}%` }}>
            <Star className={`${dim} fill-amber-400 text-amber-400`} />
          </span>
        </span>
      ))}
    </span>
  )
}
