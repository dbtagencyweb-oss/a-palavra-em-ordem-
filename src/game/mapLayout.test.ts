import { describe, expect, it } from 'vitest'
import mapa from '../../content/mapa.json'
import { footprints, fullPath, mapLayout, nodePoint, type MapNodeSpec } from './mapLayout'

describe('mapLayout', () => {
  it('stacks day 1 at the bottom and the last day at the top, overlapping by the seam', () => {
    const l = mapLayout(390, 7, 15)
    expect(l.segH).toBe(693)
    expect(l.segTop(7)).toBe(0)
    expect(l.segTop(1)).toBe(6 * l.step)
    expect(l.height).toBe(l.segTop(1) + l.segH)
    // Neighbours overlap by ~15% of a segment.
    expect(l.segH - l.step).toBeCloseTo(693 * 0.15, -1)
  })

  it('places nodes in percent of their own segment', () => {
    const l = mapLayout(400, 7, 15)
    const p = nodePoint(l, { dia: 7, x: 50, y: 50 })
    expect(p).toEqual({ x: 200, y: l.segTop(7) + l.segH / 2 })
    expect(nodePoint(l, { dia: 7, x: 0, y: 0 }).y).toBe(0)
  })

  it('content/mapa.json has one node per day, clear of the seams, with room for its label', () => {
    const nos = mapa.nos as MapNodeSpec[]
    expect(nos.map((n) => n.dia)).toEqual([1, 2, 3, 4, 5, 6, 7])
    for (const n of nos) {
      expect(n.y).toBeGreaterThanOrEqual(20)
      expect(n.y).toBeLessThanOrEqual(100 - mapa.emenda)
      // The label card (up to ~200px with its gap) must fit inside a 375px map.
      if (n.rotulo === 'esquerda') expect(n.x).toBeGreaterThanOrEqual(54)
      else expect(n.x).toBeLessThanOrEqual(46)
    }
  })

  it('builds one continuous path through every node', () => {
    const d = fullPath([{ x: 0, y: 100 }, { x: 50, y: 50 }, { x: 0, y: 0 }])
    expect(d.startsWith('M0 100')).toBe(true)
    expect(d.match(/C/g)).toHaveLength(2)
  })
})

describe('footprints', () => {
  // A straight road going up the screen (y decreasing), 200px long.
  const up = (l: number) => ({ x: 100, y: 300 - l })

  it('alternates left and right feet, offset to each side, facing the way of the path', () => {
    const f = footprints(200, up, { spacing: 20, side: 5, margin: 20 })
    expect(f.length).toBeGreaterThan(5)
    expect(f.map((p) => p.left).slice(0, 4)).toEqual([true, false, true, false])
    // Walking up: the left foot is on the left (smaller x).
    expect(f[0].x).toBeCloseTo(95)
    expect(f[1].x).toBeCloseTo(105)
    for (const p of f) expect(Math.round(p.angle) % 360).toBe(0)
  })

  it('keeps the ends clear and returns nothing for a road shorter than the margins', () => {
    const f = footprints(200, up, { margin: 40 })
    expect(Math.max(...f.map((p) => p.y))).toBeLessThanOrEqual(260)
    expect(Math.min(...f.map((p) => p.y))).toBeGreaterThanOrEqual(100)
    expect(footprints(60, up, { margin: 40 })).toEqual([])
  })

  it('turns prints to follow a road going right', () => {
    const f = footprints(200, (l) => ({ x: l, y: 50 }))
    expect(Math.round(f[0].angle)).toBe(90)
  })
})
