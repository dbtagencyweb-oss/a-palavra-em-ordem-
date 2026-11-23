import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'

const ToastCtx = createContext<(text: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((t: string) => {
    setText(t)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setText(null), 2200)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-[72px] z-30 flex justify-center px-4">
        <AnimatePresence>
          {text && (
            <motion.div
              key={text}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl bg-ink px-[18px] py-3 text-center text-[13.5px] font-semibold text-paper"
            >
              {text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
