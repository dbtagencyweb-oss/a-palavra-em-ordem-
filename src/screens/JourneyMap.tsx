import { devUnlockAll } from '../dev/unlockAll'
import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import mapa from '../../content/mapa.json'
import { trilha } from '../content'
import { footprints, mapLayout, nodePoint, sparkles, windingFullPath, windingPath, type Footprint, type MapNodeSpec, type Sparkle } from '../game/mapLayout'
import { imagePath, imageSrcSet } from '../media/paths'
import { soundManager } from '../sound/SoundManager'
import { eraOf } from '../ui/eras'
import { MapAtmosphere } from './MapAtmosphere'

interface Props {
  /** Days completed (1..n in order). */
  doneCount: number
  /** Is the next day open today (false = it unlocks tomorrow). */
  nextAvailable: boolean
  onTapDay(n: number): void
  /** Frame the current day when Home opens (off when the journey is already on Trilha 2, above). */
  autoScroll?: boolean
}

const NODES = mapa.nos as MapNodeSpec[]
const SEAM = mapa.emenda
const NODE = 64
const STEP_MS = 90
// Footprints: dark, like pressed earth, with a faint light rim.
const SAND = '#3B2816'
const LABEL_GAP = 42 // from the node centre to the label card
const GUTTER = 20 // free space between a label card and the edge of the screen

// How far the walked road was drawn last time, so only the new stretch animates on return.
const MAP_SEEN_KEY = 'pao:map-seen'
function readSeen(): number {
  try {
    return Number(localStorage.getItem(MAP_SEEN_KEY)) || 0
  } catch {
    return 0
  }
}
function writeSeen(n: number) {
  try {
    localStorage.setItem(MAP_SEEN_KEY, String(n))
  } catch {
    /* ignore */
  }
}

/** Nearest scrolling ancestor (the .screen section). */
function scroller(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const s = getComputedStyle(p).overflowY
    if ((s === 'auto' || s === 'scroll') && p.scrollHeight > p.clientHeight) return p
  }
  return null
}

export function JourneyMap({ doneCount, nextAvailable, onTapDay, autoScroll = true }: Props) {
  const reduced = useReducedMotion()
  const boxRef = useRef<HTMLDivElement>(null)
  const stretchRefs = useRef<(SVGPathElement | null)[]>([])
  const timers = useRef<number[]>([])
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const count = trilha.dias.length
  const layout = useMemo(() => mapLayout(width || 390, count, SEAM), [width, count])
  const points = useMemo(() => NODES.map((n) => nodePoint(layout, n)), [layout])
  // The road's swings stay inside the picture.
  const bounds = useMemo(() => ({ minX: 26, maxX: layout.width - 26 }), [layout.width])

  // The node the walker has reached (index = day - 1). It trails the real progress while the
  // footsteps animation plays, then catches up.
  const target = Math.min(doneCount, count - 1)
  const [reached, setReached] = useState(() => Math.min(readSeen(), target))
  const [walking, setWalking] = useState<number | null>(null) // stretch index being walked (from node i to i+1)
  const [fading, setFading] = useState<number | null>(null) // reduced motion: stretches from here on fade in
  const busy = useRef(false)
  useEffect(() => writeSeen(reached), [reached])
  // Progress went back (reset): no walk, just stand on the right node.
  if (reached > target) setReached(target)

  // Footprints for each stretch, measured on the real SVG paths.
  const [prints, setPrints] = useState<Footprint[][]>([])
  // The glittering trail along each walked stretch.
  const [sparks, setSparks] = useState<Sparkle[][]>([])
  useLayoutEffect(() => {
    if (!width) return
    const els = points.slice(1).map((_, i) => stretchRefs.current[i])
    setPrints(els.map((el) => (el ? footprints(el.getTotalLength(), (l) => el.getPointAtLength(l), { margin: NODE / 2 + 10, spacing: 17, side: 7.5 }) : [])))
    setSparks(els.map((el, i) => (el ? sparkles(el.getTotalLength(), (l) => el.getPointAtLength(l), { margin: NODE / 2 + 6, spacing: 8, spread: 11, seed: i + 1 }) : [])))
  }, [points, width])

  const scrollToY = useCallback(
    (y: number, smooth: boolean) => {
      const box = boxRef.current
      const sc = scroller(box)
      if (!box || !sc) return
      const top = box.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop + y - sc.clientHeight / 2
      sc.scrollTo({ top: Math.max(0, top), behavior: smooth && !reduced ? 'smooth' : 'auto' })
    },
    [reduced],
  )

  // Parallax for the atmosphere layers: the visible centre of the map, in map px, as --vc.
  useEffect(() => {
    const box = boxRef.current
    if (!box || !width || reduced) return
    const sc = scroller(box)
    if (!sc) return
    let raf = 0
    const update = () => {
      raf = 0
      const offset = box.getBoundingClientRect().top - sc.getBoundingClientRect().top
      box.style.setProperty('--vc', String(Math.round(sc.clientHeight / 2 - offset)))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    sc.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      sc.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
      box.style.removeProperty('--vc')
    }
  }, [width, reduced])

  // Opening Home: glide to where the walker stands.
  const scrolled = useRef(false)
  // The first walk after opening is already framed by the opening scroll.
  const walkedFirst = useRef(reached)
  useEffect(() => {
    if (!width || scrolled.current) return
    if (!autoScroll) {
      scrolled.current = true
      return
    }
    // If a walk is about to play, frame the stretch it will cover instead of the starting node.
    const y = reached < target ? (points[reached].y + points[reached + 1].y) / 2 - 30 : points[reached].y
    walkedFirst.current = reached < target ? reached : -1
    const id = window.setTimeout(() => {
      scrolled.current = true
      scrollToY(y, true)
    }, 120)
    return () => window.clearTimeout(id)
  }, [width, points, reached, scrollToY, autoScroll])

  // New progress (back from the Conclusion screen, or the DEV button): walk the next stretch.
  useEffect(() => {
    if (!width || !prints.length || busy.current || reached >= target) return
    const from = reached
    if (reduced) {
      setFading(from)
      setReached(target)
      return
    }
    const steps = prints[from]?.length ?? 0
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))
    const lead = 650
    busy.current = true
    // Chained walks (several days at once) keep the camera on each new stretch.
    if (from !== walkedFirst.current) later(() => scrollToY((points[from].y + points[from + 1].y) / 2 - 30, true), 0)
    walkedFirst.current = -1
    later(() => setWalking(from), lead)
    for (let i = 1; i < steps; i += 2) later(() => soundManager.play('footstep_sand'), lead + i * STEP_MS)
    later(() => {
      busy.current = false
      setWalking(null)
      setReached(from + 1) // the lamp slides on and the node lights up
    }, lead + steps * STEP_MS + 200)
  }, [width, prints, reached, target, reduced, points, scrollToY])

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
      timers.current = []
      busy.current = false
    },
    [],
  )

  const walkMs = (i: number) => (prints[i]?.length ?? 0) * STEP_MS
  const lampAt = points[reached]
  const lampSide = NODES[reached].rotulo === 'esquerda' ? 1 : -1 // opposite side of the label

  return (
    <div ref={boxRef} className="relative isolate w-full flex-none overflow-hidden" style={{ height: layout.height }} data-testid="journey-map">
      {/* Background: one picture per day, Day 1 at the bottom, each fading into the one below. */}
      {trilha.dias.map((d) => (
        <MapSegment key={d.n} day={d.n} count={count} top={layout.segTop(d.n)} height={layout.segH} />
      ))}
      <MapAtmosphere layout={layout} />

      <svg
        className="pointer-events-none absolute inset-0 z-[10] [filter:drop-shadow(0_1px_1.5px_rgba(0,0,0,0.35))]"
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        aria-hidden="true"
      >
        {/* The road ahead: soft dots. */}
        <path d={windingFullPath(points, bounds)} fill="none" stroke="#F5EFE3" strokeOpacity="0.9" strokeWidth="3.5" strokeDasharray="0.1 10" strokeLinecap="round" />

        {points.slice(1).map((p, i) => {
          const d = windingPath(points[i], p, i, bounds)
          const walked = i < reached
          const isWalking = walking === i
          return (
            <g key={i}>
              {/* Hidden measuring path for getPointAtLength. */}
              <path ref={(el) => (stretchRefs.current[i] = el)} d={d} fill="none" stroke="none" />
              {(walked || isWalking) && (
                <motion.path
                  d={d}
                  fill="none"
                  stroke="#D9733F"
                  strokeOpacity="0.75"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={isWalking ? { pathLength: 0 } : fading !== null && i >= fading ? { opacity: 0 } : false}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={isWalking ? { duration: walkMs(i) / 1000, ease: 'linear' } : { duration: 0.6 }}
                />
              )}
              {(walked || isWalking) &&
                prints[i]?.map((f, k) => (
                  <motion.g
                    key={k}
                    initial={isWalking ? { opacity: 0, scale: 0.4 } : fading !== null && i >= fading ? { opacity: 0 } : false}
                    animate={{ opacity: 0.92, scale: 1 }}
                    transition={isWalking ? { delay: (k * STEP_MS) / 1000, duration: 0.18 } : { duration: 0.6 }}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  >
                    <Print f={f} />
                  </motion.g>
                ))}
            </g>
          )
        })}
      </svg>

      {/* The glittering trail: tiny radiant particles over the walked road, twinkling or drifting up
          like bubbles. Its own layer (no drop shadow) so the animation stays light. */}
      <svg className="pointer-events-none absolute inset-0 z-[11]" width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
        <defs>
          <radialGradient id="spark-g">
            <stop offset="0" stopColor="#FFFBEA" />
            <stop offset="0.35" stopColor="#FFE6A3" stopOpacity="0.95" />
            <stop offset="0.7" stopColor="#F2BE6E" stopOpacity="0.35" />
            <stop offset="1" stopColor="#F2BE6E" stopOpacity="0" />
          </radialGradient>
        </defs>
        {sparks.map((list, i) => {
          const walked = i < reached
          const isWalking = walking === i
          if (!walked && !isWalking) return null
          return (
            <g key={i}>
              {list.map((sp, k) => (
                <g
                  key={k}
                  className={isWalking ? 'spark-in' : fading !== null && i >= fading ? 'spark-fade' : undefined}
                  style={{ '--in': `${(sp.t * walkMs(i)) / 1000}s` } as React.CSSProperties}
                >
                  <circle
                    cx={sp.x.toFixed(1)}
                    cy={sp.y.toFixed(1)}
                    r={(sp.r * 2.6).toFixed(1)}
                    fill="url(#spark-g)"
                    className={reduced ? undefined : sp.kind === 'float' ? 'spark-float' : 'spark-twinkle'}
                    style={{ animationDelay: `${sp.delay.toFixed(2)}s`, animationDuration: `${sp.dur.toFixed(2)}s` }}
                  />
                </g>
              ))}
            </g>
          )
        })}
      </svg>

      {/* Medals and their labels. */}
      {trilha.dias.map((d, i) => {
        const p = points[i]
        const done = i < doneCount
        const lit = !done && i === reached && i === target
        // DEV panel → "Liberar tudo": every day can be opened, so none is shown as locked.
        const status = done ? 'concluído' : lit ? (nextAvailable ? 'disponível' : 'libera amanhã') : devUnlockAll() ? 'disponível' : 'bloqueado'
        const labelLeft = NODES[i].rotulo === 'esquerda'
        // The card never comes closer than GUTTER to the screen edge; long titles wrap instead.
        const labelMax = Math.min(180, Math.max(110, (labelLeft ? p.x : layout.width - p.x) - LABEL_GAP - GUTTER))
        return (
          <div
            key={d.n}
            className="absolute z-[20]"
            style={{ left: p.x, top: p.y }}
            data-node={d.n}
            data-state={done ? 'done' : lit ? 'current' : 'locked'}
          >
            <button
              type="button"
              onClick={() => onTapDay(d.n)}
              aria-label={`Dia ${d.n}: ${d.titulo} (${status})`}
              className={`map-node absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-[filter,opacity] duration-700 active:scale-95 ${
                done ? 'map-node-done' : lit ? (nextAvailable ? 'map-node-current' : '') : 'opacity-40 grayscale'
              }`}
              style={{ width: NODE, height: NODE }}
            >
              <Medal id={d.simbolo.midia} n={d.n} />
              {done && <span className="map-node-shine" style={{ animationDelay: `${(i * 1.7) % 6}s` }} />}
            </button>
            <div
              style={{ maxWidth: labelMax, [labelLeft ? 'right' : 'left']: LABEL_GAP }}
              className={`absolute top-0 w-max -translate-y-1/2 rounded-xl bg-paper/85 px-3 py-2 shadow-[0_4px_14px_rgba(30,34,48,0.18)] backdrop-blur-[3px] ${
                labelLeft ? 'text-right' : ''
              }`}
            >
              <small className="block text-[10px] font-bold uppercase tracking-[0.12em] text-gold-ink">
                Dia {d.n} · {d.lugar}
              </small>
              <strong className={`mt-0.5 block font-display text-[14.5px] font-semibold leading-[1.2] ${done || lit ? 'text-ink' : 'text-ink-3'}`}>
                {d.titulo}
              </strong>
              {lit && <em className="text-[11.5px] not-italic text-ink-2">{nextAvailable ? 'Toque para começar' : 'Libera amanhã'}</em>}
            </div>
          </div>
        )
      })}

      {/* "Você está aqui": a small oil lamp beside the walker's node. */}
      <motion.div
        className="pointer-events-none absolute left-0 top-0 z-[25]"
        initial={false}
        animate={{ x: lampAt.x + lampSide * (NODE / 2 + 8) - 19, y: lampAt.y - NODE / 2 - 12 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 16 }}
        aria-hidden="true"
        data-testid="map-lamp"
      >
        <Candeia />
      </motion.div>
      <span className="sr-only" aria-live="polite">
        {`Você está no Dia ${reached + 1}`}
      </span>
    </div>
  )
}

function MapSegment({ day, count, top, height }: { day: number; count: number; top: number; height: number }) {
  const isTop = day === count
  const isBottom = day === 1
  const id = `mapa-d${day}`
  const era = eraOf(day)
  const [stage, setStage] = useState<'srcset' | 'single' | 'missing'>('srcset')
  const [loaded, setLoaded] = useState(false)
  // Each picture (except Day 1, at the bottom) sits over the one below it and fades its lower edge
  // into it, on an eased curve so the seam has no visible start or end.
  const s = 100 - SEAM
  const at = (k: number) => `${(s + SEAM * k).toFixed(1)}%`
  const mask = isBottom
    ? undefined
    : `linear-gradient(to bottom, #000 ${s}%, rgba(0,0,0,.92) ${at(0.15)}, rgba(0,0,0,.7) ${at(0.35)}, rgba(0,0,0,.4) ${at(0.55)}, rgba(0,0,0,.15) ${at(0.75)}, rgba(0,0,0,.04) ${at(0.9)}, transparent)`
  return (
    <div
      className="absolute inset-x-0"
      style={{ top, height, zIndex: day, WebkitMaskImage: mask, maskImage: mask, background: `linear-gradient(${era.mid}, ${era.deep})` }}
      data-media-id={id}
    >
      {stage === 'missing' ? (
        <span className="absolute left-3 top-[20%] rounded bg-black/35 px-2 py-1 font-mono text-[11px] text-white/80">{id}</span>
      ) : (
        <img
          key={stage}
          src={imagePath(id)}
          srcSet={stage === 'srcset' ? imageSrcSet(id) : undefined}
          sizes="(max-width: 480px) 100vw, 480px"
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setStage(stage === 'srcset' ? 'single' : 'missing')}
          className={`h-full w-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {/* Soft edges where the map meets the page. */}
      {isTop && <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-paper to-transparent" />}
      {/* Day 1 ends in a dark vignette: a longer, eased fade so it melts into the page. */}
      {isBottom && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44"
          style={{ background: 'linear-gradient(to top, #F5EFE3 10%, rgba(245,239,227,.85) 32%, rgba(245,239,227,.45) 60%, rgba(245,239,227,.12) 85%, transparent)' }}
        />
      )}
    </div>
  )
}

/** The day's medal; a plain gold disc with the day number while the picture is missing. */
function Medal({ id, n }: { id: string; n: number }) {
  const [missing, setMissing] = useState(false)
  if (missing)
    return (
      <span className="grid h-full w-full place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#F1E3C4,#B8893A_60%,#8A672B)] font-display text-xl font-bold text-ink shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35)]">
        {n}
      </span>
    )
  return (
    <img
      src={imagePath(id)}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setMissing(true)}
      className="h-full w-full rounded-full object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)]"
    />
  )
}

/** One sandal print, toes up in its own coordinates, then placed and turned along the road. */
function Print({ f }: { f: Footprint }) {
  return (
    <g transform={`translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${f.angle.toFixed(1)}) scale(${f.left ? 1.35 : -1.35} 1.35)`}>
      <g fill={SAND} fillOpacity="0.92" stroke="#F5EFE3" strokeOpacity="0.28" strokeWidth="0.5">
        <path d="M-1.9 4.6c-.9-1.4-1-3.4-.5-5.2.4-1.5 1.3-2.4 2.3-2.3 1.1.1 1.6 1.2 1.6 2.7 0 1.4-.4 2.4-.4 3.6 0 1.3-.6 2-1.5 2-.7 0-1.1-.3-1.5-.8z" />
        <circle cx="-1.4" cy="-4.3" r="0.65" />
        <circle cx="-0.1" cy="-4.8" r="0.7" />
        <circle cx="1.2" cy="-4.4" r="0.6" />
      </g>
    </g>
  )
}

/** Small oil lamp with a flickering flame: "você está aqui". */
function Candeia() {
  return (
    <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-paper/95 shadow-[0_3px_10px_rgba(0,0,0,0.35),0_0_0_2px_rgba(246,201,154,0.7)]">
    <svg width="28" height="28" viewBox="0 0 28 28" className="-mt-0.5">
      <circle cx="17" cy="9" r="8" fill="#F6C99A" opacity="0.35" className="lamp-glow" />
      <g className="flame" style={{ transformOrigin: '17px 15px' }}>
        <path d="M17 15c-2.6-2-2-5.2 0-8.4 2 3.2 2.6 6.4 0 8.4z" fill="#C4572E" />
        <path d="M17 14.2c-1.1-.9-.9-2.6 0-4.2.9 1.6 1.1 3.3 0 4.2z" fill="#F6C99A" />
      </g>
      <path d="M3 16h19c-1.2 4.6-4.8 7-9.5 7S4.2 20.6 3 16z" fill="#8A672B" />
      <path d="M3 16h19" stroke="#F1E3C4" strokeWidth="1" strokeLinecap="round" opacity=".6" />
      <path d="M22 17.5c3 0 4-2.4 2.2-3.6" fill="none" stroke="#8A672B" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
    </span>
  )
}
