import { describe, expect, it } from 'vitest'
import { apply, invert, rectToQuad, toMatrix3d, type Pt } from './homography'

const LEFT: Pt[] = [[300, 185], [632, 160], [632, 500], [225, 525]]
const close = (a: Pt, b: Pt) => {
  expect(a[0]).toBeCloseTo(b[0], 6)
  expect(a[1]).toBeCloseTo(b[1], 6)
}

describe('homography', () => {
  it('maps the flat rectangle corners onto the page corners', () => {
    const m = rectToQuad(340, 340, LEFT)
    close(apply(m, [0, 0]), LEFT[0])
    close(apply(m, [340, 0]), LEFT[1])
    close(apply(m, [340, 340]), LEFT[2])
    close(apply(m, [0, 340]), LEFT[3])
  })

  it('inverts: a page point goes back to the same flat point', () => {
    const m = rectToQuad(340, 340, LEFT)
    const back = invert(m)
    for (const p of [[17, 40], [200, 300], [339, 1]] as Pt[]) close(apply(back, apply(m, p)), p)
  })

  it('writes a CSS matrix3d with 16 numbers', () => {
    const css = toMatrix3d(rectToQuad(340, 340, LEFT))
    expect(css.startsWith('matrix3d(')).toBe(true)
    expect(css.slice(9, -1).split(',')).toHaveLength(16)
  })
})
