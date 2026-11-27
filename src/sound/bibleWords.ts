export function bibleWords(text: string) {
  return Array.from(text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:[-'’][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu),
    ({ 0: word, index }) => ({ word, start: index, end: index + word.length }))
}

export function estimatedWordStarts(text: string, duration: number) {
  const words = bibleWords(text)
  const weights = words.map(({ word, end }, index) => {
    const punctuation = text.slice(end, words[index + 1]?.start)
    const pause = /[.!?;:]/.test(punctuation) ? 2 : punctuation.includes(',') ? 1 : 0
    return 2 + Math.sqrt(word.length) + pause
  })
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let elapsed = 0
  return weights.map((weight) => {
    const start = elapsed / total * duration
    elapsed += weight
    return start
  })
}

export function wordAtTime(starts: readonly number[], seconds: number) {
  let low = 0
  let high = starts.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (starts[middle] <= seconds) low = middle + 1
    else high = middle
  }
  return low - 1
}
