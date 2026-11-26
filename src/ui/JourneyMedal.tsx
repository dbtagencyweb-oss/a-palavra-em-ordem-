import { useState } from 'react'
import { imagePath } from '../media/paths'

export function JourneyMedal({ id, n }: { id: string; n: number }) {
  const [missing, setMissing] = useState(false)
  if (missing) return (
    <span className="grid h-full w-full place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#F1E3C4,#B8893A_60%,#8A672B)] font-display text-xl font-bold text-ink shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35)]">
      {n}
    </span>
  )
  return (
    <img
      src={imagePath(id)}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setMissing(true)}
      className="h-full w-full rounded-full object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)]"
    />
  )
}
