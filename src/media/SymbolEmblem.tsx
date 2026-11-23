import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { LockIcon } from '../ui/icons'
import { SmartImage } from './SmartImage'

interface Props {
  midia: string
  unlocked: boolean
  size?: number
  /** Play the "silhouette turns gold" moment (Conclusion screen). */
  revealing?: boolean
}

// Engraved gold medallion: a brushed-gold disc with an inner ring, like a struck coin.
const GOLD = 'radial-gradient(circle at 32% 28%, #F1E3C4 0%, #D4AE62 28%, #B8893A 58%, #8A672B 100%)'
const SILHOUETTE = 'radial-gradient(circle at 32% 28%, rgba(30,34,48,.10), rgba(30,34,48,.22))'

/** A collection symbol as a medallion: gold when unlocked, a dim silhouette otherwise. */
export function SymbolEmblem({ midia, unlocked, size = 46, revealing = false }: Props) {
  const reduced = useReducedMotion()
  const tiny = size < 70
  const ring = Math.max(2, Math.round(size * 0.06))
  // Once the generated medallion exists, it IS the coin: the drawn disc and ring step aside.
  const [art, setArt] = useState(false)
  return (
    <div
      className="relative flex-none overflow-hidden rounded-full transition-[background] duration-700"
      style={{
        width: size,
        height: size,
        background: art ? 'transparent' : unlocked ? GOLD : SILHOUETTE,
        boxShadow: unlocked && !art ? 'inset 0 -2px 4px rgba(90,60,20,.35), 0 2px 6px rgba(30,34,48,.25)' : undefined,
      }}
    >
      {/* Inner engraved ring */}
      {!art && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: ring,
            border: `1px solid ${unlocked ? 'rgba(90,60,20,.45)' : 'rgba(30,34,48,.18)'}`,
            boxShadow: unlocked ? 'inset 0 1px 0 rgba(255,255,255,.35)' : undefined,
          }}
        />
      )}
      {/* The symbol art sits inside the ring */}
      <div
        className={`absolute overflow-hidden rounded-full transition-[filter,opacity] duration-700 ${unlocked ? '' : art ? 'opacity-30 grayscale' : 'opacity-20 brightness-0 grayscale'}`}
        style={{ inset: art ? 0 : ring * 2.2, filter: art && unlocked ? 'drop-shadow(0 2px 4px rgba(30,34,48,.3))' : undefined }}
      >
        <SmartImage
          id={midia}
          fill
          responsive={false}
          onLoad={() => setArt(true)}
          className="!bg-transparent [&>img]:object-contain"
          placeholderClassName={`!bg-transparent [&>span]:border-0 [&>span]:text-[#4A3512] ${unlocked ? '' : '[&>span]:invisible'} ${
            tiny ? '[&>span]:break-all [&>span]:px-0 [&>span]:text-[6.5px] [&>span]:leading-tight' : '[&>span]:text-[10px]'
          }`}
        />
      </div>
      {!unlocked && (
        <span className="absolute inset-0 grid place-items-center text-ink-3">
          <LockIcon size={tiny ? 16 : 22} />
        </span>
      )}
      {revealing && unlocked && !reduced && (
        // A light sweep crossing the medallion as it turns gold.
        <motion.span
          className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
          initial={{ left: '-60%' }}
          animate={{ left: '130%' }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}
