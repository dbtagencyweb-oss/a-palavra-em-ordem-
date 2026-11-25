// The "continue" card on Home. It sits under the map and floats over it (sticky) while you scroll,
// so it is on screen as soon as Home opens on the current day. While floating it turns to frosted
// glass over the map; docked in its place it wears the day's picture. A thin light runs around its
// border either way, and a thumbnail of the day's picture sits beside the text.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Picture } from '../content/trails'
import { Backdrop } from '../media/Backdrop'
import { CoverImage } from '../media/CoverImage'
import { imageSmallPath } from '../media/paths'
import { eraOf } from '../ui/eras'

interface Props {
  day: number
  eyebrow: string
  title: string
  sub: string
  icon: ReactNode
  iconDone: boolean
  /** The day's own covers (best first). Without them, the era picture of `day`. */
  pictures?: Picture[]
  onClick(): void
}

export function ContinueCard({ day, eyebrow, title, sub, icon, iconDone, pictures, onClick }: Props) {
  const era = eraOf(day)
  const sentinel = useRef<HTMLDivElement>(null)
  const [floating, setFloating] = useState(true)
  const [thumbOk, setThumbOk] = useState(true)

  // Floating = its own place in the page (marked by the sentinel just below it) is under the fold.
  useEffect(() => {
    const el = sentinel.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setFloating(!e.isIntersecting && e.boundingClientRect.top > 0))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div className={`continue-glow sticky bottom-4 z-[6] mx-7 -mt-11 rounded-card ${floating ? 'is-floating' : ''}`}>
        <button
          type="button"
          onClick={onClick}
          data-testid="continue-card"
          data-floating={floating}
          className="relative flex min-h-[88px] w-full items-center gap-3.5 overflow-hidden rounded-card py-3.5 pl-3.5 pr-4 text-left text-paper transition-[background-color,box-shadow] duration-500"
          style={{
            backgroundColor: floating ? 'rgba(30,34,48,0.56)' : era.deep,
            backdropFilter: floating ? 'blur(14px) saturate(1.3)' : undefined,
            WebkitBackdropFilter: floating ? 'blur(14px) saturate(1.3)' : undefined,
            boxShadow: floating ? '0 12px 30px rgba(20,22,32,0.38), inset 0 1px 0 rgba(255,255,255,0.14)' : '0 6px 18px rgba(30,34,48,0.22)',
          }}
        >
          {/* Docked: the day's picture behind the text. Floating: plain glass, the map shows through. */}
          <div className={`absolute inset-0 transition-opacity duration-500 ${floating ? 'opacity-0' : 'opacity-100'}`} aria-hidden="true">
            {pictures ? (
              <>
                <CoverImage key={pictures[0]?.full} pictures={pictures} className="absolute inset-0 h-full w-full object-cover object-[center_35%]" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${era.deep}F2 0%, ${era.deep}C8 52%, ${era.deep}55 100%)` }} />
              </>
            ) : (
              <Backdrop key={day} id={`era-d${day}`} tint={era.deep} variant="card" />
            )}
          </div>
          <span
            className="relative h-[60px] w-[60px] flex-none overflow-hidden rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.35),0_0_0_1px_rgba(241,227,196,0.35)]"
            style={{ background: `linear-gradient(${era.mid}, ${era.deep})` }}
            aria-hidden="true"
          >
            {pictures ? (
              <CoverImage key={pictures[0]?.full} pictures={pictures} small className="h-full w-full object-cover" />
            ) : thumbOk && (
              <img
                key={day}
                src={imageSmallPath(`era-d${day}`)}
                alt=""
                decoding="async"
                onError={() => setThumbOk(false)}
                className="h-full w-full object-cover"
              />
            )}
          </span>
          <div className="relative min-w-0 flex-1">
            <small className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold-soft/85">{eyebrow}</small>
            <strong className="my-0.5 block font-display text-[16.5px] font-semibold leading-tight">{title}</strong>
            <span className="text-[12.5px] opacity-75">{sub}</span>
          </div>
          <span
            className={`relative grid h-11 w-11 flex-none place-items-center rounded-full ${iconDone ? 'bg-olive' : 'play-shine'}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        </button>
      </div>
      <div ref={sentinel} className="mb-4 h-px" aria-hidden="true" />
    </>
  )
}
