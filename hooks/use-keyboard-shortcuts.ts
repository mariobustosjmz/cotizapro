'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const SEQUENCE_ROUTES: Record<string, string> = {
  'g,d': '/dashboard',
  'g,c': '/dashboard/clients',
  'g,q': '/dashboard/quotes',
  'g,r': '/dashboard/reminders',
  'g,s': '/dashboard/services',
  'n,c': '/dashboard/quotes/new',
}

const SEQUENCE_TIMEOUT_MS = 1000

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

export function useKeyboardShortcuts() {
  const router = useRouter()
  const keySequence = useRef<string[]>([])
  const sequenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip when user is typing in a form field
      if (isEditableTarget(e.target)) return
      // Skip modifier-key combos (⌘K handled by command palette)
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const key = e.key.toLowerCase()
      keySequence.current = [...keySequence.current, key]

      // Reset timer on each keystroke
      if (sequenceTimer.current) clearTimeout(sequenceTimer.current)
      sequenceTimer.current = setTimeout(() => {
        keySequence.current = []
      }, SEQUENCE_TIMEOUT_MS)

      const sequence = keySequence.current.join(',')
      const route = SEQUENCE_ROUTES[sequence]

      if (route) {
        e.preventDefault()
        router.push(route)
        keySequence.current = []
        if (sequenceTimer.current) clearTimeout(sequenceTimer.current)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (sequenceTimer.current) clearTimeout(sequenceTimer.current)
    }
  }, [router])
}
