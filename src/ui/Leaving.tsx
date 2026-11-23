import { useIsPresent } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Screens and cards animate out while the next one is already in place (AnimatePresence "popLayout").
 * During that exit, the old one must not be focusable, clickable or read aloud.
 */
export function Leaving({ children, attrs }: { children: ReactNode; attrs?: Record<string, string> }) {
  const present = useIsPresent()
  const extra = present ? attrs : { inert: '', 'aria-hidden': 'true' }
  return (
    <div className="contents" {...extra}>
      {children}
    </div>
  )
}
