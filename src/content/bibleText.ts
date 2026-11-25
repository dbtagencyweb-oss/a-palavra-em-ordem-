import { livros } from './index'

export type BibleText = Record<string, [number, string][]>

const directory = '/biblia-livre/2018'
const cacheName = 'pao-biblia-livre-2018'
const bookUrl = (id: string) => `${directory}/${id}.json`

async function fetchBook(id: string, signal?: AbortSignal) {
  const response = await fetch(bookUrl(id), { signal })
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Texto indisponível')
  }
  return response
}

export async function loadBibleText(id: string, signal: AbortSignal): Promise<BibleText> {
  let cached: Response | undefined
  try {
    if ('caches' in window) cached = await (await caches.open(cacheName)).match(bookUrl(id))
  } catch {
    // Browser storage may be disabled even when Cache Storage is exposed.
  }
  const response = cached ?? await fetchBook(id, signal)
  return response.json()
}

export async function offlineBookCount() {
  const cache = await caches.open(cacheName)
  const paths = new Set((await cache.keys()).map((request) => new URL(request.url).pathname))
  return livros.filter((book) => paths.has(bookUrl(book.id))).length
}

export async function downloadBibleText(onProgress: (count: number) => void) {
  const cache = await caches.open(cacheName)
  let count = 0
  for (const book of livros) {
    const url = bookUrl(book.id)
    if (!await cache.match(url)) await cache.put(url, await fetchBook(book.id))
    onProgress(++count)
  }
}
