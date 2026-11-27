import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose(): void
  /** id of the heading that names the dialog, or a plain label. */
  labelledBy?: string
  label?: string
  tone?: 'light' | 'dark'
  className?: string
  backdropClassName?: string
  centered?: boolean
  animateLayout?: boolean
  children: ReactNode
}

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select, [tabindex]:not([tabindex="-1"])'

/**
 * Bottom sheet used by every overlay (offer, book fact sheet, symbol, iPhone guide).
 * Keeps keyboard focus inside while open, closes on Esc or a tap on the backdrop,
 * and gives focus back to whatever opened it.
 */
export function Sheet({ open, onClose, labelledBy, label, tone = 'light', className = '', backdropClassName = 'bg-[rgba(20,18,14,.5)]', centered = false, animateLayout = false, children }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const t = window.setTimeout(() => {
      const el = panel.current
      const preferred = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>(FOCUSABLE)
      preferred?.focus()
    }, 50)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      opener?.focus({ preventScroll: true })
    }
  }, [open])

  const host = typeof document !== 'undefined' ? document.querySelector('.device') : null
  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`absolute inset-0 z-20 flex ${centered ? 'items-center justify-center' : 'items-end'} ${backdropClassName}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={panel}
            layout={animateLayout && !reducedMotion}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : label}
            className={`w-full ${centered ? '' : 'max-h-[88%] overflow-y-auto rounded-t-[24px] px-6 pb-7 pt-[26px]'} ${
              tone === 'dark' ? 'bg-ink text-paper' : 'bg-paper'
            } ${className}`}
            initial={{ y: centered ? (reducedMotion ? 0 : 12) : '100%' }}
            animate={{ y: 0 }}
            exit={{ y: centered ? (reducedMotion ? 0 : 12) : '100%' }}
            transition={{ duration: 0.3, ease: [0.3, 0.8, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
  return host ? createPortal(content, host) : content
}
