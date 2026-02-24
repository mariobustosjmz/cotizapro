'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { QuickActionsList } from './quick-actions'

export function FAB() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOpen = () => {
    setIsOpen(!isOpen)
  }

  const handleActionClick = () => {
    setIsOpen(false)
  }

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscapeKey)
    return () => {
      window.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen])

  return (
    <div className="lg:hidden fixed bottom-6 right-6 z-50">
      {/* Action Pills - Animated */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-in fade-in zoom-in-75 duration-200">
          <QuickActionsList
            variant="vertical"
            onActionClick={handleActionClick}
            className="py-2"
          />
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={toggleOpen}
        className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
        aria-label="Acciones rápidas"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </button>
    </div>
  )
}
