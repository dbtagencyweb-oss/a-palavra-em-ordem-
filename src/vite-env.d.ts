declare module 'virtual:trail-outlines' {
  /** trail id → outline of each day (see scripts/vite-trail-outlines.mjs). */
  const outlines: Record<string, unknown[]>
  export default outlines
  /** Studies (estudo-*): only the fields the store shows, never editorial notes. */
  export const studyMetas: Record<string, unknown>
}
