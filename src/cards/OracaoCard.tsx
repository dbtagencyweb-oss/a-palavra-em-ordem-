import { lazy, Suspense } from 'react'
import type { CardOf, CardProps } from './types'

const loadPrayerHands = () => import('../ui/PrayerHands3D')
const PrayerHands3D = lazy(() => loadPrayerHands().then((module) => ({ default: module.PrayerHands3D })))

/** Warm the WebGL code while the reflection card before the prayer is open. */
export function preloadPrayerHands3D() {
  void loadPrayerHands().then((module) => module.preloadPrayerHandsModel())
}

/** The day closes in prayer, with open hands on the era's dark background. */
export function OracaoCard({ card, api }: CardProps<CardOf<'oracao'>>) {
  const era = api.era
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden px-7 pb-6 pt-4">
      <div aria-hidden="true" className="prayer-hands-symbol relative mx-auto mt-7 w-[200px]">
        <span className="prayer-hands-halo" />
        <span className="prayer-hands-light" />
        <Suspense fallback={null}>
          <PrayerHands3D />
        </Suspense>
      </div>

      <div className="relative mt-auto">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: era.light, opacity: 0.75 }}>
          Dia {api.dayN} · {card.rotulo ?? 'Oração'}
        </div>
        <h2 className="mb-4 text-2xl" style={{ color: era.light }}>
          Para terminar.
        </h2>
        <p className="border-l-2 pl-[18px] pt-1 font-serif text-[21px] italic leading-[1.6]" style={{ color: era.light, borderColor: era.mid }}>
          {card.texto}
        </p>
      </div>
    </div>
  )
}
