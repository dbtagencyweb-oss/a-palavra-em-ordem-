import { useSyncExternalStore } from 'react'

/** Wide screens (≥1024px): the hero's book sits beside the text; narrower, under the hero. */
const QUERY = '(min-width: 1024px)'

export function useWide(): boolean {
  return useSyncExternalStore(
    (fn) => {
      const mq = window.matchMedia(QUERY)
      mq.addEventListener('change', fn)
      return () => mq.removeEventListener('change', fn)
    },
    () => window.matchMedia(QUERY).matches,
  )
}

/** Phones (<768px): the map shows only line and points, with a caption under the book. */
export function usePhone(): boolean {
  return useSyncExternalStore(
    (fn) => {
      const mq = window.matchMedia('(max-width: 767px)')
      mq.addEventListener('change', fn)
      return () => mq.removeEventListener('change', fn)
    },
    () => window.matchMedia('(max-width: 767px)').matches,
  )
}
