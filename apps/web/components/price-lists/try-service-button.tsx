'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TestCalculatorDialog } from './test-calculator-dialog'

interface TryServiceButtonProps {
  readonly serviceName: string
  readonly definition: unknown
}

export function TryServiceButton({ serviceName, definition }: TryServiceButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setOpen(true)} aria-label={`Probar ${serviceName}`}>
        <Calculator className="w-3.5 h-3.5" />
        Probar
      </Button>
      {/* Portal: the trigger lives inside a right-aligned, nowrap table cell whose text styles would leak into the dialog. */}
      {open && createPortal(<TestCalculatorDialog serviceName={serviceName} definition={definition} onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}
