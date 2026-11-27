import { expect, it } from 'vitest'
import { createProgress } from '../game/progress'
import { livros } from './index'
import { readBibleChapters, readingChapters } from './readingOrder'

it('covers every chapter once and keeps the transitions in reading order', () => {
  const ids = readingChapters.map(({ id }) => id)
  const canonical = livros.flatMap(({ id, capitulos }) =>
    Array.from({ length: capitulos }, (_, index) => `${id}:${index + 1}`),
  )
  expect([...ids].sort()).toEqual(canonical.sort())
  expect(ids.slice(48, 52)).toEqual(['gn:49', 'gn:50', 'job:1', 'job:2'])
  expect(ids.slice(ids.indexOf('at:14'), ids.indexOf('at:15') + 1)).toEqual([
    'at:14', 'tg:1', 'tg:2', 'tg:3', 'tg:4', 'tg:5',
    'gl:1', 'gl:2', 'gl:3', 'gl:4', 'gl:5', 'gl:6', 'at:15',
  ])
})

it('counts chapters from both routes once and skips review days in the total', () => {
  const read = readBibleChapters({
    ...createProgress(),
    readChapters: ['gn:1', 'gn:6', 'job:2', 'gn:999'],
    trails: { 'biblia-em-ordem': { 1: '2026-11-26', 2: '2026-11-27', 6: '2026-12-01', 30: '2026-12-25' } },
  })
  expect(read).toEqual(new Set(['gn:1', 'gn:2', 'gn:3', 'gn:6', 'job:1', 'job:2']))
  expect(readingChapters.find(({ id }) => !read.has(id))?.id).toBe('gn:4')
})
