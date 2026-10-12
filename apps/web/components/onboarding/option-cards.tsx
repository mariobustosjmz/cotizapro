'use client'

export interface OptionCard<T extends string> {
  readonly value: T
  readonly title: string
  readonly description: string
}

interface OptionCardsProps<T extends string> {
  readonly name: string
  readonly options: readonly OptionCard<T>[]
  readonly value: T | null
  readonly onChange: (value: T) => void
  readonly columns?: 'grid-cols-1' | 'grid-cols-1 sm:grid-cols-3' | 'grid-cols-1 sm:grid-cols-2'
}

export function OptionCards<T extends string>({ name, options, value, onChange, columns = 'grid-cols-1 sm:grid-cols-3' }: OptionCardsProps<T>) {
  return (
    <div role="radiogroup" aria-label={name} className={`grid ${columns} gap-2`}>
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`${name}-${o.value}`}
            onClick={() => onChange(o.value)}
            className={`text-left rounded-xl border p-3 transition-colors ${
              selected
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 ring-1 ring-orange-500'
                : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700'
            }`}
          >
            <span className="block font-semibold text-sm text-gray-900 dark:text-white">{o.title}</span>
            <span className="block mt-0.5 text-xs text-gray-500 dark:text-gray-400">{o.description}</span>
          </button>
        )
      })}
    </div>
  )
}
