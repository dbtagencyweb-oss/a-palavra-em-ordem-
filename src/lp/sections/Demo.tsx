// 6b · "Experimente agora, aqui mesmo": right after "O app por dentro", a real activity of Day 1 to
// play inside a phone. The playable part (DemoPlay, with the app's activity and sounds) loads only
// when the section comes near the screen.
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useReveal } from '../useReveal'

const DemoPlay = lazy(() => import('./DemoPlay'))

export function Demo() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '600px 0px' })
    io.observe(root.current!)
    return () => io.disconnect()
  }, [])

  const frame = <div className="mx-auto aspect-[390/780] w-full max-w-[360px] rounded-[38px] bg-[#14161F] p-[9px]" aria-hidden="true"><div className="h-full w-full rounded-[30px] bg-paper" /></div>

  return (
    <section id="experimente" ref={root} className="relative bg-paper-2 px-5 py-20 text-ink md:py-28">
      <div className="mx-auto max-w-5xl md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-14">
        <div className="text-center md:text-left">
          <h2 data-reveal className="font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] md:text-5xl">
            Experimente agora, aqui mesmo.
          </h2>
          <p data-reveal className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-ink-2 md:mx-0 md:text-lg">
            Esta é uma atividade de verdade do Dia 1. Toque nos passos na ordem certa.
          </p>
        </div>
        <div className="mt-10 md:mt-0 md:w-[360px]">{near ? <Suspense fallback={frame}><DemoPlay /></Suspense> : frame}</div>
      </div>
    </section>
  )
}
