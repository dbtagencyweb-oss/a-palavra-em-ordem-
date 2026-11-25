import { expect, it } from 'vitest'
import { livros } from './index'
import { readingChapters } from './readingOrder'

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
