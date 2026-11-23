// 4 · O mecanismo. The section pins; 66 book spines stand on a shelf in the order they are bound
// (which reads as shuffled). As you scroll they slide into the order of the story, grouped in 7
// blocks in the eras' colors, and a path appears linking the blocks: Criação → … → Igreja.
// Reduced motion: the shelf is shown already in story order, with the path.
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import landing from '../../../content/landing.json'
import livrosJson from '../../../content/livros.json'
import { eraOf } from '../../ui/eras'
import { gsap, reducedMotion } from '../motion'
import { useReveal } from '../useReveal'

const m = landing.mecanismo
interface Book {
  id: string
  nome: string
  capitulos: number
}
const BOOKS = (livrosJson.livros as Book[]).map((b) => ({ id: b.id, nome: b.nome, capitulos: b.capitulos }))
const blockOf = new Map<string, number>()
m.blocos.forEach((b, i) => b.livros.forEach((id) => blockOf.set(id, i)))
/** Block colors: the eras' signature colors; Reis and Exílio share an era, so Exílio gets a dusk tone. */
const blockColor = (i: number) => (m.blocos[i].nome === 'Exílio' ? '#8B7BB0' : eraOf(m.blocos[i].dia).mid)
const storyIndex = new Map<string, number>(m.blocos.flatMap((b) => b.livros).map((id, i) => [id, i]))

interface Slot {
  x: number
  y: number
}

/** Positions for a list of spines flowing in rows; `gapAfter` adds space where a block ends. */
function flow(width: number, w: number, gap: number, rowH: number, n: number, blockGap = 0, block?: (i: number) => number) {
  const out: Slot[] = []
  let x = 0
  let y = 0
  for (let i = 0; i < n; i++) {
    if (i > 0 && block && block(i) !== block(i - 1)) x += blockGap
    if (x + w > width + 0.5) {
      x = 0
      y += rowH
    }
    out.push({ x, y })
    x += w + gap
  }
  return { slots: out, height: y + rowH }
}

export function Mechanism() {
  const root = useRef<HTMLElement>(null)
  const shelf = useRef<HTMLDivElement>(null)
  useReveal(root)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = shelf.current!
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const layout = useMemo(() => {
    if (!width) return null
    const desk = width >= 640
    const perRow = desk ? 34 : 22
    const gap = desk ? 4 : 3
    const blockGap = desk ? 14 : 9
    const w = Math.floor((width - blockGap * 3 - gap * (perRow - 1)) / perRow)
    const rowH = desk ? 118 : 86
    const start = flow(width, w, gap, rowH, BOOKS.length)
    const storyOrder = [...BOOKS].sort((a, b) => storyIndex.get(a.id)! - storyIndex.get(b.id)!)
    const end = flow(width, w, gap, rowH, storyOrder.length, blockGap, (i) => blockOf.get(storyOrder[i].id)!)
    const endById = new Map(storyOrder.map((b, i) => [b.id, end.slots[i]]))
    return { w, rowH, start, end, endById, height: Math.max(start.height, end.height), desk }
  }, [width])

  useLayoutEffect(() => {
    const el = root.current
    if (!el || !layout) return
    const q = gsap.utils.selector(el)
    const spines = q('.spine') as HTMLElement[]
    const toEnd = (s: HTMLElement) => layout.endById.get(s.dataset.id!)!
    if (reducedMotion()) {
      spines.forEach((s) => gsap.set(s, { x: toEnd(s).x, y: toEnd(s).y, backgroundColor: s.dataset.color }))
      gsap.set(q('.mech-path > *, .mech-caption, .mech-label-end'), { opacity: 1 })
      gsap.set(q('.mech-label-start'), { opacity: 0 })
      return
    }
    const ctx = gsap.context(() => {
      spines.forEach((s, i) => gsap.set(s, { x: layout.start.slots[i].x, y: layout.start.slots[i].y }))
      gsap.set(q('.mech-path > *'), { opacity: 0, y: 10 })
      gsap.set(q('.mech-caption, .mech-label-end'), { opacity: 0 })
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: q('.mech-stage')[0],
          start: 'top top',
          end: () => `+=${window.innerHeight * 2.2}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
      // A little restlessness first: the shelf as it is feels jumbled.
      tl.to(spines, { rotation: () => gsap.utils.random(-6, 6), duration: 0.25, stagger: { each: 0.004, from: 'random' } }, 0)
      // Then each book slides to its place in the story and takes its era's color.
      spines.forEach((s) => {
        const e = toEnd(s)
        tl.to(s, { x: e.x, y: e.y, rotation: 0, backgroundColor: s.dataset.color, duration: 1, ease: 'power2.inOut' }, 0.3 + (storyIndex.get(s.dataset.id!)! / BOOKS.length) * 0.9)
      })
      tl.to(q('.mech-label-start'), { opacity: 0, duration: 0.2 }, 0.3)
        .to(q('.mech-label-end'), { opacity: 1, duration: 0.3 }, 1.9)
        .to(q('.mech-path > *'), { opacity: 1, y: 0, duration: 0.25, stagger: 0.12 }, 2.1)
        .to(q('.mech-caption'), { opacity: 1, duration: 0.4 }, 3.0)
        .to({}, { duration: 0.4 })
    }, el)
    return () => ctx.revert()
  }, [layout])

  return (
    <section id="mecanismo" ref={root} className="relative bg-paper text-ink">
      <div className="mech-stage flex min-h-[100svh] flex-col justify-center px-5 py-16 md:px-10">
        <div className="mx-auto w-full max-w-5xl">
          <h2 data-reveal className="text-center font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] md:text-5xl">
            {m.titulo}
          </h2>

          <div className="relative mt-8 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">
            <span className="mech-label-start">{m.rotuloInicio}</span>
            <span className="mech-label-end absolute left-0 top-0 text-gold-ink">{m.rotuloFim}</span>
          </div>

          <div
            ref={shelf}
            className="relative mt-3 w-full"
            style={{ height: layout ? layout.height : 260 }}
            role="img"
            aria-label={`${m.rotuloFim}: ${m.blocos.map((b) => b.nome).join(', ')}`}
          >
            {layout &&
              BOOKS.map((b) => {
                                const h = Math.round(layout.rowH * (0.62 + Math.min(1, b.capitulos / 66) * 0.28))
                return (
                  <div
                    key={b.id}
                    data-id={b.id}
                    data-color={blockColor(blockOf.get(b.id)!)}
                    title={b.nome}
                    className="spine absolute left-0 top-0 flex items-start justify-center overflow-hidden rounded-t-[3px] rounded-b-[1px] bg-[#D8CCB3] shadow-[inset_-2px_0_0_rgba(0,0,0,0.12),inset_1px_0_0_rgba(255,255,255,0.25)]"
                    style={{ width: layout.w, height: h, marginTop: layout.rowH - 12 - h }}
                  >
                    {layout.desk && (
                      <span className="mt-1.5 text-[8.5px] font-bold uppercase leading-none text-white/80 [writing-mode:vertical-rl]">{b.id}</span>
                    )}
                  </div>
                )
              })}
            {/* Shelf boards under each row. */}
            {layout &&
              Array.from({ length: Math.round(layout.height / layout.rowH) }, (_, r) => (
                <div key={r} aria-hidden="true" className="absolute -inset-x-2 h-[6px] rounded-sm bg-[#B79E78] shadow-[0_3px_6px_rgba(30,34,48,0.18)]" style={{ top: (r + 1) * layout.rowH - 12 }} />
              ))}
          </div>

          {/* The path linking the blocks. */}
          <ol className="mech-path mt-8 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2.5">
            {m.blocos.map((b, i) => (
              <li key={b.nome} className="flex items-center gap-1.5">
                <span className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[13px] font-semibold shadow-card md:text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: blockColor(i) }} />
                  {b.nome}
                </span>
                {i < m.blocos.length - 1 && (
                  <span aria-hidden="true" className="text-gold">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p className="mech-caption mt-7 text-center font-serif text-[20px] italic text-ink-2 md:text-2xl">{m.legenda}</p>
        </div>
      </div>
    </section>
  )
}
