// Perspective from four corners: the projective map (homography) that takes a flat w×h rectangle
// to any quadrilateral, as a CSS matrix3d, plus the forward and inverse point maps. Used to lay the
// hero map flat on each page of the open book (src/lp/HeroBook.tsx).

export type Pt = [number, number]
/** 3×3 matrix, row-major, with m[8] = 1: x' = (m0 x + m1 y + m2) / (m6 x + m7 y + 1). */
export type Mat3 = [number, number, number, number, number, number, number, number, number]

/** Unit square (0,0)(1,0)(1,1)(0,1) → quad q (corners in the same order: TL, TR, BR, BL). */
function squareToQuad([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]: Pt[]): Mat3 {
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const sx = x0 - x1 + x2 - x3
  const sy = y0 - y1 + y2 - y3
  const den = dx1 * dy2 - dx2 * dy1
  const g = (sx * dy2 - dx2 * sy) / den
  const h = (dx1 * sy - sx * dy1) / den
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1]
}

/** Flat rectangle w×h (origin top-left) → quad q (TL, TR, BR, BL). */
export function rectToQuad(w: number, h: number, q: Pt[]): Mat3 {
  const m = squareToQuad(q)
  // Pre-scale the input by (1/w, 1/h).
  return [m[0] / w, m[1] / h, m[2], m[3] / w, m[4] / h, m[5], m[6] / w, m[7] / h, 1]
}

export function apply(m: Mat3, [x, y]: Pt): Pt {
  const z = m[6] * x + m[7] * y + m[8]
  return [(m[0] * x + m[1] * y + m[2]) / z, (m[3] * x + m[4] * y + m[5]) / z]
}

export function invert(m: Mat3): Mat3 {
  const [a, b, c, d, e, f, g, h, i] = m
  const A = e * i - f * h
  const B = -(d * i - f * g)
  const C = d * h - e * g
  const det = a * A + b * B + c * C
  const r = [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map((v) => v / det)
  return r.map((v) => v / r[8]) as Mat3
}

/** The same map as a CSS transform (with transform-origin 0 0 on the flat element). */
export function toMatrix3d(m: Mat3): string {
  const [a, b, c, d, e, f, g, h, i] = m
  // CSS matrix3d is column-major; z passes through untouched.
  return `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, i].map((v) => +v.toFixed(9)).join(',')})`
}
