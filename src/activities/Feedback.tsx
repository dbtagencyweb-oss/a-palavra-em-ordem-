import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  kind: 'good' | 'bad' | null
  text: string
}

/** Right/wrong feedback, announced to screen readers. */
export function Feedback({ kind, text }: Props) {
  return (
    <div aria-live="polite" role="status" className="relative mt-1">
      <AnimatePresence mode="popLayout">
        {kind && (
          <motion.p
            key={kind + text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={kind === 'good' ? 'feedback-good' : 'feedback-bad'}
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
