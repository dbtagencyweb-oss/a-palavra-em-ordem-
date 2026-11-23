// Geometry of the illustrated map on Home (pure functions, no DOM).
// The map is a vertical stack of one picture per day (mapa-dN, 1080×1920), read bottom to top:
// Day 1 at the bottom, the last day at the top (the roads in the pictures lead up into the distance).
// Each picture overlaps the one below it by `overlap` percent of its height.

export interface MapNodeSpec {
  dia: number
  /** Percent of the segment width (0 = left edge). */
  x: number
  /** Percent of the segment height (0 = top of the segment). */
  y: number
  rotulo?: 'direita' | 'esquerda'
}

export interface Point {
  x: number
  y: number
}

export const SEGMENT_RATIO = 1920 / 1080

export interface MapLayout {
  width: number
  segH: number
  /** Vertical distance between the tops of two neighbouring segments. */
  step: number
  height: number
  count: number
  /** Top edge of the segment of day n (1-based). */
  segTop(n: number): number
}

export function mapLayout(width: number, count: number, overlapPct: number): MapLayout {
  const segH = Math.round(width * SEGMENT_RATIO)
  const step = Math.round(segH * (1 - overlapPct / 100))
  return {
    width,
    segH,
    step,
    count,
    height: segH + step * (count - 1),
    segTop: (n) => (count - n) * step,
  }
}

export function nodePoint(layout: MapLayout, spec: MapNodeSpec): Point {
  return {
    x: (spec.x / 100) * layout.width,
    y: layout.segTop(spec.dia) + (spec.y / 100) * layout.segH,
  }
}

/** Smooth S-curve from a to b with vertical tangents (the road climbs between the nodes). */
export function stretchPath(a: Point, b: Point): string {
  const my = (a.y + b.y) / 2
  return `M${r(a.x)} ${r(a.y)} C${r(a.x)} ${r(my)}, ${r(b.x)} ${r(my)}, ${r(b.x)} ${r(b.y)}`
}

/** The whole road through every node, in day order. */
export function fullPath(points: Point[]): string {
  if (!points.length) return ''
  let d = `M${r(points[0].x)} ${r(points[0].y)}`
  for (let i = 1; i < points.length; i++) d += ' ' + stretchPath(points[i - 1], points[i]).replace(/^M[^C]+/, '')
  return d
}

export interface Footprint {
  x: number
  y: number
  /** Degrees; 0 = toes pointing up. */
  angle: number
  left: boolean
}

/**
 * Footprints along a path of `length`, sampled by `at` (e.g. SVGPathElement.getPointAtLength).
 * Left and right feet alternate, each pushed a little to its side of the road and turned
 * to face the way the path goes. The ends stay clear so prints don't sit under the medals.
 */
export function footprints(
  length: number,
  at: (l: number) => Point,
  { spacing = 15, side = 4.5, margin = 40 } = {},
): Footprint[] {
  const out: Footprint[] = []
  const usable = length - margin * 2
  if (usable <= 0) return out
  const n = Math.max(1, Math.floor(usable / spacing))
  const gap = usable / n
  for (let i = 0; i <= n; i++) {
    const l = margin + i * gap
    const p = at(l)
    const q = at(Math.min(length, l + 1))
    const o = at(Math.max(0, l - 1))
    const dx = q.x - o.x
    const dy = q.y - o.y
    const len = Math.hypot(dx, dy) || 1
    const left = i % 2 === 0
    // Normal pointing to the walker's left: rotate the direction 90° counter-clockwise (screen coords).
    const nx = dy / len
    const ny = -dx / len
    const s = left ? side : -side
    out.push({
      x: p.x + nx * s,
      y: p.y + ny * s,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI + 90,
      left,
    })
  }
  return out
}

const r = (v: number) => Math.round(v * 10) / 10

// ---------- Winding road ----------

/**
 * The road between two medals, winding left and right like a path walked on foot (the S-curves of
 * the reference sketch): a smooth curve through points pushed alternately to each side of the
 * straight line, flat at both ends so it leaves and arrives at the medals cleanly. `seed` flips the
 * first turn from one stretch to the next; `bounds` keeps the swings inside the picture.
 */
export function windingPath(a: Point, b: Point, seed = 0, bounds?: { minX: number; maxX: number }): string {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const halfWaves = Math.max(2, Math.round(len / 150))
  const amp = Math.min(56, len / 6)
  // Unit normal to the straight line.
  const nx = -dy / len
  const ny = dx / len
  const first = seed % 2 === 0 ? 1 : -1
  const pts: Point[] = []
  for (let i = 0; i <= halfWaves; i++) {
    const t = i / halfWaves
    const edge = i === 0 || i === halfWaves
    // Gentler swings near the medals, full in the middle.
    const ease = edge ? 0 : Math.sin(Math.PI * t) ** 0.6
    const side = (i % 2 === 1 ? 1 : -1) * first
    let x = a.x + dx * t + nx * amp * ease * side
    const y = a.y + dy * t + ny * amp * ease * side
    if (bounds) x = Math.min(bounds.maxX, Math.max(bounds.minX, x))
    pts.push({ x, y })
  }
  return smoothThrough(pts)
}

/** The whole winding road through every node (same stretches as windingPath). */
export function windingFullPath(points: Point[], bounds?: { minX: number; maxX: number }): string {
  if (!points.length) return ''
  let d = `M${r(points[0].x)} ${r(points[0].y)}`
  for (let i = 1; i < points.length; i++) d += ' ' + windingPath(points[i - 1], points[i], i - 1, bounds).replace(/^M[^C]+/, '')
  return d
}

/** Catmull-Rom through the points, as cubic Bézier segments (tangents vertical at both ends). */
function smoothThrough(p: Point[]): string {
  let d = `M${r(p[0].x)} ${r(p[0].y)}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? { x: p[i].x, y: p[i].y - (p[i + 1].y - p[i].y) }
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] ?? { x: p2.x, y: p2.y + (p2.y - p1.y) }
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${r(c1.x)} ${r(c1.y)}, ${r(c2.x)} ${r(c2.y)}, ${r(p2.x)} ${r(p2.y)}`
  }
  return d
}

// ---------- Sparkle trail ----------

export interface Sparkle {
  x: number
  y: number
  /** Radius in px. */
  r: number
  /** 0..1 along the stretch (when it appears during the walk). */
  t: number
  /** Twinkle in place, or drift up like a bubble. */
  kind: 'twinkle' | 'float'
  /** Animation delay and duration, seconds. */
  delay: number
  dur: number
}

/**
 * Small radiant particles scattered along the walked road (a glittering trail, like a cursor's
 * bubble trail). Deterministic for a given `seed`, so they don't jump on re-render.
 */
export function sparkles(length: number, at: (l: number) => Point, { spacing = 9, spread = 9, margin = 40, seed = 1 } = {}): Sparkle[] {
  let s = seed * 7919 + 17
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  const out: Sparkle[] = []
  const usable = length - margin * 2
  if (usable <= 0) return out
  const n = Math.floor(usable / spacing)
  for (let i = 0; i <= n; i++) {
    const l = margin + i * (usable / Math.max(1, n)) + (rnd() - 0.5) * spacing
    const p = at(Math.min(length, Math.max(0, l)))
    const angle = rnd() * Math.PI * 2
    const dist = Math.sqrt(rnd()) * spread
    out.push({
      x: p.x + Math.cos(angle) * dist,
      y: p.y + Math.sin(angle) * dist,
      r: 0.8 + rnd() * 1.7,
      t: l / length,
      kind: rnd() < 0.3 ? 'float' : 'twinkle',
      delay: rnd() * 3,
      dur: 1.6 + rnd() * 2.2,
    })
  }
  return out
}
