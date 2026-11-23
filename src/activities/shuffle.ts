/** Fisher-Yates shuffle that never returns the original order (when length > 1). */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  if (items.length < 2) return [...items]
  for (let attempt = 0; attempt < 20; attempt++) {
    const a = [...items]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      const tmp = a[i]
      a[i] = a[j]
      a[j] = tmp
    }
    if (a.some((x, i) => x !== items[i])) return a
  }
  return [...items.slice(1), items[0]]
}
