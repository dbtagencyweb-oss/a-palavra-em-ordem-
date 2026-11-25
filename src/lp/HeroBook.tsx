// The hero's object: a Bible that opens (video, played once) and turns into the map of the story,
// drawn like ink on its paper. Assets in public/lp/ (1280×720): biblia-fechada.webp (poster),
// biblia-abrindo.{webm,mp4} (4.8 s, silent), biblia-aberta.webp (the last frame).
//
// Each page is a flat W×H sheet laid onto the picture with a homography (CSS matrix3d from the four
// page corners in BOOK, below): the rule, the ghost text, the line, the points and the words follow
// the page's perspective. The ink layer is multiplied over the paper, so its grain shows through; the
// line fades into the crease and comes back on the other page.
//
// Sequence: the book waits, invisible, until the hero title is up (so the title area keeps the LCP);
// it fades in and the video plays once. On "ended" the still of the open book takes its place; the
// pages show ghost text; the line writes itself through the seven eras, each point
// soaks in as the line reaches it, the labels follow, and a warm light rises from the pages.
// Tapping the book writes the map again (not the video). Reduced motion: the open book with the
// whole map, still. Phones (<768px): line and points only, with a caption naming the eras.
//
// Fine tuning by eye: the corners in BOOK, and --map-x, --map-y, --map-scale on .hb (lp.css).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import eraData from '../../content/lp-eras.json'
import trilha1 from '../../content/trilhas/mapa-7-dias/trilha.json'
import { imagePath } from '../media/paths'
import { eraOf } from '../ui/eras'
import { apply, invert, rectToQuad, toMatrix3d, type Pt } from './homography'
import { onTitleDone, reducedMotion } from './motion'
import { usePhone } from './useWide'

const SRC = {
  poster: '/lp/biblia-fechada.webp',
  open: '/lp/biblia-aberta.webp',
  video: [
    { src: '/lp/biblia-abrindo.webm', type: 'video/webm' },
    { src: '/lp/biblia-abrindo.mp4', type: 'video/mp4' },
  ],
}

/** Where the pages are in the last frame (1280×720), corners TL, TR, BR, BL. Adjust by eye. */
export const BOOK = {
  left: [[300, 185], [632, 160], [632, 500], [225, 525]] as Pt[],
  right: [[642, 160], [965, 180], [1050, 520], [642, 495]] as Pt[],
  /** The crease: nothing sits on it. */
  crease: 637,
  /** Size of each flat sheet before the perspective. */
  sheet: 340,
}

const POS: Record<string, Pt> = {
  criacao: [290, 400],
  patriarcas: [390, 352],
  exodo: [490, 405],
  reis: [585, 357],
  exilio: [700, 405],
  jesus: [820, 352],
  igreja: [940, 400],
}
const START: Pt = [275, 400]
const END: Pt = [965, 400]
const DRAW_S = 1.6
const LEAD_S = 0.25 // the line starts this long after the ghost text begins to fade
const INK = '#5A3E1B'
const INK_TEXT = '#3B2A14'

/** An era's color, 40% toward grey: ink stamped on paper, not a plastic dot. */
export function desaturate(hex: string, k = 0.4): string {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const grey = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
  return `rgb(${c.map((v) => Math.round(v + (grey - v) * k)).join(',')})`
}

/**
 * Each era's seal: the symbol of a day of Trilha 1, the very file the app shows
 * (/media/img/simbolo-<id>.webp). Exílio has no symbol of its own: a dot in the era's color.
 */
const ERA_DAY: Record<string, number | null> = { criacao: 2, patriarcas: 3, exodo: 4, reis: 5, exilio: null, jesus: 6, igreja: 7 }
const daySymbol = (day: number | null) => {
  const s = day ? trilha1.simbolos.find((x) => x.dia === day) : undefined
  return s ? imagePath(`simbolo-${s.id}`) : null
}

/** The seven eras with their map position and color (also used by the comparison section). */
export const ERAS = eraData.eras.map((e) => ({
  ...e,
  pos: POS[e.id],
  selo: daySymbol(ERA_DAY[e.id] ?? null),
  // Same hues as the mechanism section (Exílio, a dusk tone), softened into ink.
  color: e.id === 'exilio' ? '#8B7BB0' : eraOf(e.dia).mid,
}))

// ---------- Geometry ----------

const S = BOOK.sheet
const PAGES = (['left', 'right'] as const).map((side) => {
  const m = rectToQuad(S, S, BOOK[side])
  return { side, m, inv: invert(m), css: toMatrix3d(m) }
})
const pageOf = (p: Pt) => (p[0] < BOOK.crease ? PAGES[0] : PAGES[1])
const toSheet = (p: Pt) => apply(pageOf(p).inv, p)

/** The wave through the points (Catmull-Rom), sampled densely in the picture's space. */
function sampleWave(pts: Pt[], per = 48): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    for (let k = 0; k < per; k++) {
      const t = k / per
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

const SAMPLES = sampleWave([START, ...ERAS.map((e) => e.pos), END])
const CUM = SAMPLES.reduce<number[]>((acc, p, i) => (acc.push(i ? acc[i - 1] + Math.hypot(p[0] - SAMPLES[i - 1][0], p[1] - SAMPLES[i - 1][1]) : 0), acc), [])
const TOTAL = CUM[CUM.length - 1]
const split = SAMPLES.findIndex((p) => p[0] >= BOOK.crease)
const sheetPath = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${toSheet(p).map((v) => v.toFixed(1)).join(' ')}`).join('')
const LINE = {
  left: sheetPath(SAMPLES.slice(0, split)),
  right: sheetPath(SAMPLES.slice(split)),
  /** Seconds: the left half, then the right half after it. */
  leftS: (CUM[split - 1] / TOTAL) * DRAW_S,
}
/** When the writing reaches each era (seconds after the line starts). */
const REACH = ERAS.map((e) => {
  let best = 0
  SAMPLES.forEach((p, i) => {
    if (Math.hypot(p[0] - e.pos[0], p[1] - e.pos[1]) < Math.hypot(SAMPLES[best][0] - e.pos[0], SAMPLES[best][1] - e.pos[1])) best = i
  })
  return (CUM[best] / TOTAL) * DRAW_S
})

/** Two columns of "ghost text" on a sheet: thin bars of varied length, in paragraphs. */
function ghostLines(seed: number) {
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const out: { x: number; y: number; w: number }[] = []
  for (const [x0, x1] of [[34, 162], [178, 306]]) {
    let para = 0
    for (let y = 34; y <= S - 36; y += 9) {
      const end = para > 4 && rnd() < 0.22
      out.push({ x: x0, y, w: (x1 - x0) * (end ? 0.35 + rnd() * 0.35 : 0.82 + rnd() * 0.18) })
      para++
      if (end) {
        y += 9
        para = 0
      }
    }
  }
  return out
}
const GHOST = { left: ghostLines(7), right: ghostLines(13) }

/** A point of the picture as a CSS position on its sheet. */
const onSheet = (p: Pt) => {
  const [x, y] = toSheet(p)
  return { left: `${x}px`, top: `${y}px` }
}
/** A point of the picture as a position over the whole picture (percent of 1280×720). */
const at = (x: number, y: number) => ({ left: `${(x / 1280) * 100}%`, top: `${(y / 720) * 100}%` })

// ---------- Component ----------

type Phase = 'waiting' | 'playing' | 'open'

export function HeroBook({ className = '' }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const phone = usePhone()
  const reduced = useMemo(() => reducedMotion(), [])
  const [shown, setShown] = useState(reduced)
  const [phase, setPhase] = useState<Phase>(reduced ? 'open' : 'waiting')
  const [draw, setDraw] = useState(reduced ? 1 : 0) // 0 = not yet; each new number writes again
  const [tip, setTip] = useState<string | null>(null) // chosen by hover, focus or tap
  const [autoTip, setAutoTip] = useState<string | null>(null) // the one dripping on its own
  const [caption, setCaption] = useState(0)

  // The stage is the picture's own 1280×720 space, scaled to the book's width.
  useLayoutEffect(() => {
    const el = root.current!
    const set = () => el.style.setProperty('--s', String(el.clientWidth / 1280))
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // The still of the open book is loaded ahead, so the swap at "ended" never flashes.
  useEffect(() => {
    new Image().src = SRC.open
  }, [])

  // Start: once the title is up and the book is on screen.
  useEffect(() => {
    if (reduced) return
    let titleUp = false
    let visible = false
    let started = false
    const go = () => {
      if (started || !titleUp || !visible) return
      started = true
      setShown(true)
      const v = video.current
      if (!v) return setPhase('open')
      setPhase('playing')
      v.play().catch(() => setPhase('open'))
    }
    const off = onTitleDone(() => {
      titleUp = true
      go()
    })
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        go()
      },
      { threshold: 0.35 },
    )
    io.observe(root.current!)
    return () => {
      off()
      io.disconnect()
    }
  }, [reduced])

  // The book is open: a beat on the blank "Bible pages", then the map is written.
  useEffect(() => {
    if (phase !== 'open' || draw !== 0) return
    const t = window.setTimeout(() => setDraw(1), 600)
    return () => window.clearTimeout(t)
  }, [phase, draw])

  // Phones: the caption follows the writing, then keeps walking the eras.
  useEffect(() => {
    if (!phone || !draw) return
    const timers: number[] = []
    if (!reduced) REACH.forEach((t, i) => timers.push(window.setTimeout(() => setCaption(i), (LEAD_S + t) * 1000)))
    let i = ERAS.length - 1
    timers.push(
      window.setTimeout(
        () => timers.push(window.setInterval(() => setCaption((i = (i + 1) % ERAS.length)), 2200)),
        (reduced ? 0 : LEAD_S + DRAW_S + 1.2) * 1000,
      ),
    )
    return () => timers.forEach((t) => (window.clearTimeout(t), window.clearInterval(t)))
  }, [phone, draw, reduced])

  // Desktop: once the map is written, the eras' notes drip onto the page one at a time, by
  // themselves. Hovering or focusing a point takes over; the drip resumes after it.
  useEffect(() => {
    if (phone || !draw || tip) return
    let i = autoTip ? ERAS.findIndex((e) => e.id === autoTip) : -1
    const step = () => setAutoTip(ERAS[(i = (i + 1) % ERAS.length)].id)
    let iv = 0
    const first = window.setTimeout(
      () => {
        step()
        iv = window.setInterval(step, 2600)
      },
      autoTip ? 1200 : (reduced ? 0.4 : LEAD_S + DRAW_S + 1.4) * 1000,
    )
    return () => {
      window.clearTimeout(first)
      window.clearInterval(iv)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, draw, tip, reduced])

  const shownTip = tip ?? autoTip

  const replay = () => {
    if (phase !== 'open' || reduced) return
    setTip(null)
    setAutoTip(null)
    setDraw((n) => n + 1)
  }

  const era = ERAS[caption]
  const frameCls = ['hb-frame', shown && 'is-shown', phase === 'open' && 'is-open', draw && 'is-drawing', reduced && 'is-static', phone && 'is-phone'].filter(Boolean).join(' ')

  return (
    <div className={`hb ${className}`}>
      <div
        ref={root}
        className={frameCls}
        onClick={replay}
        role="img"
        aria-label="Uma Bíblia se abre e, sobre as páginas, aparece o mapa da história: Criação, Patriarcas, Êxodo, Reis, Exílio, Jesus e Igreja."
      >
        <img src={SRC.open} alt="" className="hb-media" decoding="async" {...{ fetchpriority: 'low' }} />
        {!reduced && (
          <video
            ref={video}
            className={`hb-media transition-opacity duration-300 ${phase === 'open' ? 'opacity-0' : 'opacity-100'}`}
            muted
            playsInline
            preload="metadata"
            poster={SRC.poster}
            onEnded={() => setPhase('open')}
            onError={() => setPhase('open')}
            aria-hidden="true"
          >
            {SRC.video.map((s) => (
              <source key={s.src} src={s.src} type={s.type} />
            ))}
          </video>
        )}
        {/* Warm grade over the picture, to sit in the golden desert; a soft contact shadow under the book. */}
        <div className="hb-warm" aria-hidden="true" />
        <div className="hb-stage" aria-hidden="true">
          <div className="hb-contact" />
        </div>

        {/* The ink: multiplied over the paper. */}
        <div className="hb-stage hb-ink" aria-hidden="true">
          <svg width="0" height="0" className="absolute">
            <defs>
              <filter id="hb-hand" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
                <feDisplacementMap in="SourceGraphic" scale="1.5" />
              </filter>
              <filter id="hb-soft">
                <feGaussianBlur stdDeviation="0.6" />
              </filter>
            </defs>
          </svg>
          {PAGES.map((pg) => (
            <div key={pg.side} className={`hb-sheet hb-sheet-${pg.side}`} style={{ width: S, height: S, transform: pg.css }}>
              <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} className="absolute inset-0 overflow-visible">
                {/* a · Two columns of ghost text, in sepia (no frame on the page). */}
                <g className="hb-ghost" fill={INK_TEXT} fillOpacity="0.07" filter="url(#hb-soft)">
                  {GHOST[pg.side].map((l, i) => (
                    <rect key={i} x={l.x} y={l.y} width={l.w} height="3" rx="1.5" />
                  ))}
                </g>
                {draw > 0 && (
                  <g key={draw}>
                    {/* d · The line, written by hand: left half first, then the right one. */}
                    <path
                      d={LINE[pg.side]}
                      pathLength={1}
                      className="hb-path"
                      fill="none"
                      stroke={INK}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#hb-hand)"
                      style={{
                        animationDuration: `${pg.side === 'left' ? LINE.leftS : DRAW_S - LINE.leftS}s`,
                        animationDelay: `${LEAD_S + (pg.side === 'left' ? 0 : LINE.leftS)}s`,
                      }}
                    />
                    {ERAS.filter((e) => pageOf(e.pos) === pg).map((e) => {
                      const [x, y] = toSheet(e.pos)
                      return (
                        <circle
                          key={e.id}
                          cx={x}
                          cy={y}
                          r="9"
                          fill={desaturate(e.color)}
                          stroke={INK}
                          strokeWidth="1.5"
                          className="hb-dot"
                          style={{ animationDelay: `${LEAD_S + REACH[ERAS.indexOf(e)]}s` }}
                        />
                      )
                    })}
                  </g>
                )}
              </svg>

              {/* b, c, d · The words: HTML on the sheet (as SVG text they took the LCP). */}
              {draw > 0 && (
                <div key={draw} className="hb-words">
                  {pg.side === 'left' && (
                    <div className="hb-titles">
                      <p className="hb-t1" style={onSheet([448, 235])}>
                        Do Éden à Nova Jerusalém
                      </p>
                      <p className="hb-t2" style={onSheet([448, 262])}>
                        66 LIVROS · UMA HISTÓRIA
                      </p>
                    </div>
                  )}
                  {pg.side === 'right' && (
                    <div className="hb-titles">
                      <p className="hb-t3" style={onSheet([840, 240])}>
                        <svg viewBox="-16 -14 34 28" className="hb-lamp" aria-hidden="true">
                          <path d="M-12 4c0 5 6 8 12 8s12-3 12-8z" />
                          <path d="M10 6c4 0 6-2 6-5" fill="none" strokeWidth="2" />
                          <path d="M0 -12c-3 4-4 6-2 9 1 2 3 2 4 0 2-3 1-5-2-9z" />
                        </svg>
                        <span>
                          Em 7 dias, você percorre
                          <br />o caminho inteiro.
                        </span>
                      </p>
                    </div>
                  )}
                  {ERAS.filter((e) => pageOf(e.pos) === pg).map((e) => (
                    <span key={e.id} className="hb-label" style={{ ...onSheet([e.pos[0], e.pos[1] + 22]), animationDelay: `${LEAD_S + REACH[ERAS.indexOf(e)] + 0.25}s` }}>
                      {e.nome}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* e · The warm light rising from the pages, once the map is complete. */}
        {draw > 0 && (
          <div key={`glow-${draw}`} className="hb-stage" aria-hidden="true">
            <div className="hb-glow" />
          </div>
        )}

        {/* f · Hover or tap a point: the era in one line. */}
        {!phone && draw > 0 && (
          <div className="hb-stage hb-hits">
            {ERAS.map((e) => (
              <button
                key={e.id}
                type="button"
                className="hb-hit"
                style={{ left: e.pos[0], top: e.pos[1] }}
                aria-label={`${e.nome}: ${e.linha}`}
                onMouseEnter={() => setTip(e.id)}
                onMouseLeave={() => setTip((t) => (t === e.id ? null : t))}
                onFocus={() => setTip(e.id)}
                onBlur={() => setTip((t) => (t === e.id ? null : t))}
                onClick={(ev) => {
                  ev.stopPropagation()
                  setTip((t) => (t === e.id ? null : e.id))
                }}
              />
            ))}
          </div>
        )}
        {!phone &&
          ERAS.filter((e) => e.id === shownTip).map((e) => (
            <div key={`${e.id}-${draw}`} role="tooltip" className={`hb-tip ${tip ? '' : 'is-auto'}`} style={at(e.pos[0], e.pos[1])}>
              <Seal src={e.selo} color={desaturate(e.color, 0.2)} />
              <span>
                <strong className="font-semibold">{e.nome}</strong> · {e.linha}
              </span>
            </div>
          ))}
        {/* The drop lands on the point: a soft ring where the note falls. */}
        {!phone &&
          !reduced &&
          ERAS.filter((e) => e.id === shownTip).map((e) => <span key={`ping-${e.id}-${draw}`} aria-hidden="true" className="hb-ping" style={at(e.pos[0], e.pos[1])} />)}
      </div>

      {/* Phones: the caption under the book walks the eras. */}
      {phone && (
        <p className={`hb-caption ${draw ? 'opacity-100' : 'opacity-0'}`} aria-live="off">
          <span key={era.id} className="hb-caption-in inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: desaturate(era.color, 0.2) }} />
            <strong className="font-semibold text-paper">{era.nome}</strong>
            <span className="text-paper/70">· {era.linha}</span>
          </span>
        </p>
      )}
    </div>
  )
}

/** An era's seal; without one (or if the image fails), a dot in the era's color. Never a file name. */
function Seal({ src, color }: { src: string | null; color: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <span aria-hidden="true" className="ml-1 mr-0.5 h-3 w-3 flex-none rounded-full" style={{ backgroundColor: color }} />
  return <img src={src} alt="" className="h-6 w-6 flex-none" onError={() => setFailed(true)} />
}

/** Below the hero, on screens narrower than 1024px: the book after the buttons, full width. */
export function HeroBookBand() {
  return (
    <div className="relative overflow-hidden bg-ink px-4 pb-6 md:px-10">
      <HeroBook className="mx-auto max-w-[720px]" />
    </div>
  )
}
