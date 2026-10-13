import Link from 'next/link'
import { CheckCircle2, ChevronRight, Circle } from 'lucide-react'
import type { ChecklistStep } from '@/lib/onboarding/checklist'
import { DismissChecklistButton } from './dismiss-checklist-button'

export function GettingStarted({ steps }: { readonly steps: readonly ChecklistStep[] }) {
  const done = steps.filter((s) => s.done).length
  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4" data-testid="getting-started">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Primeros pasos</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{done} de {steps.length} listos</p>
        </div>
        <DismissChecklistButton />
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 mb-3 overflow-hidden">
        <div className="h-full bg-[var(--brand)]" style={{ width: `${Math.round((done / steps.length) * 100)}%` }} />
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <li key={step.id}>
            <Link href={step.href} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors ${step.done ? 'border-gray-100 dark:border-gray-800 opacity-70' : 'border-gray-200 dark:border-gray-700 hover:border-[var(--brand)]'}`}>
              {step.done ? <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" /> : <Circle className="w-4 h-4 shrink-0 text-gray-300" />}
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-medium ${step.done ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>{step.label}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{step.hint}</span>
              </span>
              {!step.done && <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
