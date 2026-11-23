// The reward at the end of a study: a rolled scroll appears, the person taps it, it unrolls and
// shows a closing message (content/trilhas/estudo-*/trilha.json → conclusao), and a wax seal is
// stamped at the bottom. With reduced motion it simply fades in, already open.
// Look: aged parchment with torn sides between two paper rolls with turned wooden handles
// (styles .parchment and .parchment-roll in index.css).
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useState } from 'react'
import { soundManager } from '../sound/SoundManager'

export interface ScrollMessage {
  selo: string
  titulo: string
  mensagem: string
  referencia: string
}

interface Props {
  open: boolean
  /** The study's name, shown above the scroll ("Romanos concluído"). */
  heading: string
  message: ScrollMessage
  onClose(): void
}

export function ScrollReward({ open, heading, message, onClose }: Props) {
  const reduced = useReducedMotion()
  const [unrolled, setUnrolled] = useState(false)

  useEffect(() => {
    if (!open) return
    setUnrolled(Boolean(reduced))
    soundManager.play('scene_in')
  }, [open, reduced])

  function unroll() {
    if (unrolled) return
    soundManager.play('card_next')
    setUnrolled(true)
    // The seal lands after the parchment is open.
    window.setTimeout(() => soundManager.play('symbol_unlock'), reduced ? 0 : 1500)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-[rgba(20,22,32,0.86)] px-4 py-8 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`${heading}: ${message.titulo}`}
          data-testid="pergaminho"
          data-aberto={unrolled}
        >
          {/* Soft glow behind the scroll. */}
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(226,197,128,0.3),transparent_65%)]" />

          <motion.p
            className="relative mb-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-gold-soft"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {heading}
          </motion.p>

          <motion.div
            className="relative w-[min(86vw,330px)]"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.7, rotate: -8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            transition={reduced ? { duration: 0.25 } : { type: 'spring', stiffness: 160, damping: 16, delay: 0.25 }}
          >
            <button
              type="button"
              onClick={unroll}
              disabled={unrolled}
              aria-label={unrolled ? undefined : 'Abrir o pergaminho'}
              className="block w-full text-left disabled:cursor-default"
            >
              <Roll />
              <motion.div
                className="relative z-0 mx-[14px] -my-[6px] overflow-hidden"
                initial={false}
                animate={{ height: unrolled ? 'auto' : 0 }}
                transition={reduced ? { duration: 0 } : { duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="parchment relative px-7 pb-[92px] pt-8 text-center text-[#3B2C16]">
                  <motion.div
                    initial={false}
                    animate={{ opacity: unrolled ? 1 : 0, y: unrolled ? 0 : 8 }}
                    transition={{ delay: reduced ? 0 : 0.55, duration: 0.5 }}
                  >
                    <small className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#80602A]">Uma mensagem para você</small>
                    <h2 className="mt-2 font-display text-[25px] font-semibold leading-tight text-[#2E2210]">{message.titulo}</h2>
                    <div aria-hidden="true" className="mx-auto my-3 h-px w-16 bg-[#9C7A44]/60" />
                    <p className="font-display text-[16.5px] leading-relaxed">{message.mensagem}</p>
                    <p className="mt-3 text-[12.5px] font-semibold text-[#80602A]">{message.referencia}</p>
                  </motion.div>
                </div>
                {/* Wax seal, stamped once the scroll is open. The wrapper centers it, so the
                    animation's transform never fights the centering. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                  <AnimatePresence>
                    {unrolled && (
                      <motion.div
                        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.8, rotate: -12 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={reduced ? { duration: 0.2 } : { delay: 1.45, type: 'spring', stiffness: 420, damping: 18 }}
                      >
                        <WaxSeal size={68} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
              <Roll />
            </button>

            {!unrolled && (
              <motion.p
                className="mt-5 text-center text-[14px] font-semibold text-paper/85"
                animate={reduced ? undefined : { opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Toque para abrir
              </motion.p>
            )}
          </motion.div>

          <AnimatePresence>
            {unrolled && (
              <motion.div
                className="relative mt-6 flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : 1.9 }}
              >
                <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-gold-soft">{message.selo} conquistado</span>
                <button type="button" onClick={onClose} className="btn-shine min-h-12 min-w-[200px] rounded-btn px-6 text-[15px] font-bold">
                  Amém
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** One rolled end: a paper cylinder with a turned wooden handle on each side. */
function Roll() {
  return (
    <div aria-hidden="true" className="relative z-[1] flex items-center">
      <Knob />
      <div className="parchment-roll relative h-[30px] flex-1 rounded-[9px]">
        {/* The spiral of the rolled paper, seen at each end. */}
        <span className="absolute inset-y-[3px] left-[5px] w-[6px] rounded-full border-l-2 border-[#6A4620]/45" />
        <span className="absolute inset-y-[3px] right-[5px] w-[6px] rounded-full border-r-2 border-[#6A4620]/45" />
      </div>
      <Knob flip />
    </div>
  )
}

/** A turned wooden handle (collar, ring, neck and a round end), pointing outward. */
function Knob({ flip = false }: { flip?: boolean }) {
  const id = useId()
  return (
    <svg width="26" height="34" viewBox="0 0 26 34" className={`-mx-[2px] flex-none ${flip ? '-scale-x-100' : ''}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A2010" />
          <stop offset="0.3" stopColor="#8E5A30" />
          <stop offset="0.45" stopColor="#B57A45" />
          <stop offset="0.7" stopColor="#6A3E1C" />
          <stop offset="1" stopColor="#2E180A" />
        </linearGradient>
      </defs>
      <rect x="18" y="9" width="8" height="16" rx="2" fill={`url(#${id})`} />
      <ellipse cx="16" cy="17" rx="3" ry="11" fill={`url(#${id})`} />
      <rect x="8" y="12.5" width="8" height="9" rx="2" fill={`url(#${id})`} />
      <ellipse cx="9" cy="17" rx="2" ry="7" fill={`url(#${id})`} />
      <circle cx="5.5" cy="17" r="5.5" fill={`url(#${id})`} />
    </svg>
  )
}

/** A red wax seal with the app's lamp pressed into the middle. */
export function WaxSeal({ size = 64 }: { size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="drop-shadow-[0_3px_4px_rgba(60,10,4,0.45)]">
      <defs>
        <radialGradient id={`${id}w`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#D0503A" />
          <stop offset="0.6" stopColor="#A12D1E" />
          <stop offset="1" stopColor="#6E1A10" />
        </radialGradient>
        <radialGradient id={`${id}d`} cx="55%" cy="60%" r="65%">
          <stop offset="0" stopColor="#B33A27" />
          <stop offset="1" stopColor="#7E2014" />
        </radialGradient>
      </defs>
      {/* Wax blob: an irregular round edge, centered on 32,32. */}
      <path
        d="M32 2.5c3.6 0 5 2.6 8.4 3.6s6.6-.6 8.7 1.9.2 5.6 2 8.4 5.4 3.6 5.6 7.2-2.6 4.8-2.6 8.4 2.9 5.4 1.6 8.6-5 3-7.3 5.6-2.1 6.2-5.6 7.5-6-1.8-9.6-1.8-6 2.9-9.6 1.8-3.4-5.2-6-7.5-6.4-2.3-7.6-5.6 1.8-5 1.8-8.6-2.9-5-1.8-8.6 4.8-4.3 6.2-7.4-.1-6 2.4-8.2 6.4-.2 9.6-1.4 4.4-3.6 8.2-3.6z"
        fill={`url(#${id}w)`}
      />
      {/* Pressed disc with a raised rim. */}
      <circle cx="32" cy="32" r="19" fill={`url(#${id}d)`} />
      <circle cx="32" cy="32" r="19" fill="none" stroke="#E58A6E" strokeOpacity="0.55" strokeWidth="1.4" />
      <circle cx="32" cy="32" r="16.2" fill="none" stroke="#5E140B" strokeOpacity="0.45" strokeWidth="0.8" />
      {/* Lamp, centered: flame on top, oil lamp body below. */}
      <g fill="#F4BFA6">
        <path d="M32 21.5c2.6 3 3 5.8.1 8.6-2.9-2.8-2.6-5.6-.1-8.6z" fillOpacity="0.95" />
        <path d="M21 33.5c0-1.2 1-1.9 2.2-1.9h15.6c2.6 0 4.6 1 5.6 2.4.4.5 0 1.1-.6 1.1H40c-1.4 2.7-4.3 4.4-8 4.4s-6.6-1.7-8-4.4h-1.4c-.9 0-1.6-.7-1.6-1.6z" fillOpacity="0.85" />
        <rect x="27.5" y="40.5" width="9" height="2" rx="1" fillOpacity="0.7" />
      </g>
    </svg>
  )
}
