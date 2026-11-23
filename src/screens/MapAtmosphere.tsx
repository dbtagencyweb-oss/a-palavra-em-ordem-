// Atmosphere over the illustrated map: soft glowing particles that gather where the pictures are
// brightest. Pure decoration (aria-hidden, no pointer events). The seams between pictures are a plain
// crossfade (the mask in JourneyMap's MapSegment), so each picture keeps its own colours.
//
// Parallax: JourneyMap writes the visible centre of the map (in map px) to the CSS variable --vc on
// its box while you scroll. Each particle moves by (--vc - its own y) × its speed. With
// prefers-reduced-motion --vc is never set and nothing moves.
import { useEffect, useMemo, useState } from 'react'
import type { MapLayout } from '../game/mapLayout'
import { imageSmallPath } from '../media/paths'

/** Small deterministic random, so the layout is the same on every render and device. */
function rng(seed: number) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function parallax(y: number, speed: number): React.CSSProperties {
  return { transform: `translate3d(0, calc((var(--vc, ${y}) - ${y}) * ${speed}px), 0)` }
}

interface Spot {
  x: number
  y: number
}

// Where each picture is brightest, measured once on its small version (same origin, so the canvas
// can read it). Particles are drawn there, so they read as light in the air, not as dots on shadow.
const spotCache = new Map<string, Promise<Spot[]>>()
function brightSpots(id: string, count: number, seed: number): Promise<Spot[]> {
  const key = `${id}:${count}`
  const hit = spotCache.get(key)
  if (hit) return hit
  const job = new Promise<Spot[]>((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onerror = () => resolve([])
    img.onload = () => {
      try {
        const W = 18
        const H = 32
        const c = document.createElement('canvas')
        c.width = W
        c.height = H
        const ctx = c.getContext('2d', { willReadFrequently: true })
        if (!ctx) return resolve([])
        ctx.drawImage(img, 0, 0, W, H)
        const px = ctx.getImageData(0, 0, W, H).data
        const weights: number[] = []
        let total = 0
        for (let i = 0; i < W * H; i++) {
          const l = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255
          const w = Math.max(0, l - 0.5) ** 2
          weights.push(w)
          total += w
        }
        if (total === 0) return resolve([])
        const r = rng(seed)
        const out: Spot[] = []
        for (let k = 0; k < count; k++) {
          let t = r() * total
          let i = 0
          while (i < weights.length - 1 && (t -= weights[i]) > 0) i++
          out.push({ x: (((i % W) + r()) / W) * 100, y: ((Math.floor(i / W) + r()) / H) * 100 })
        }
        resolve(out)
      } catch {
        resolve([])
      }
    }
    img.src = imageSmallPath(id)
  })
  spotCache.set(key, job)
  return job
}

const PER_SEGMENT = 11

function SegmentParticles({ day, top, height }: { day: number; top: number; height: number }) {
  const [spots, setSpots] = useState<Spot[]>([])
  useEffect(() => {
    let alive = true
    void brightSpots(`mapa-d${day}`, PER_SEGMENT, day * 13).then((s) => alive && setSpots(s))
    return () => {
      alive = false
    }
  }, [day])
  const look = useMemo(() => {
    const r = rng(day * 31)
    return spots.map(() => ({ size: 1.6 + r() * 1.8, dur: 10 + r() * 9, delay: -r() * 18, speed: -(0.03 + r() * 0.08) }))
  }, [spots, day])
  return (
    <>
      {spots.map((s, i) => {
        const y = top + (s.y / 100) * height
        const m = look[i]
        return (
          <span key={i} className="absolute" style={{ left: `${s.x}%`, top: y, ...parallax(y, m.speed) }}>
            <span className="map-mote block rounded-full" style={{ width: m.size, height: m.size, animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s` }} />
          </span>
        )
      })}
    </>
  )
}

export function MapAtmosphere({ layout }: { layout: MapLayout }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[8] overflow-hidden" aria-hidden="true">
      {Array.from({ length: layout.count }, (_, i) => (
        <SegmentParticles key={i} day={i + 1} top={layout.segTop(i + 1)} height={layout.segH} />
      ))}
    </div>
  )
}
