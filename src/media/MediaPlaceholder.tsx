interface Props {
  id: string
  /** Fills its parent (for backgrounds and scenes) instead of a fixed banner. */
  fill?: boolean
  className?: string
}

/** Visible stand-in until the real file from content/midia.json lands in public/media/. */
export function MediaPlaceholder({ id, fill, className = '' }: Props) {
  return (
    <div
      role="img"
      aria-label={`Mídia pendente: ${id}`}
      data-media-id={id}
      className={`grid place-items-center bg-[#2B2F3D] text-center ${
        fill ? 'absolute inset-0' : 'h-40 w-full rounded-card'
      } ${className}`}
    >
      <span className="rounded-md border border-white/15 px-2.5 py-1 font-mono text-xs tracking-wide text-white/60">
        {id}
      </span>
    </div>
  )
}
