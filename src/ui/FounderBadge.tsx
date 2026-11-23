// "Fundador" seal: olive green with gold letters, a gold crown and a light sweeping across it
// now and then (the .seal-shine effect, static with reduced motion).
export function FounderBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`seal-shine inline-flex items-center gap-1.5 rounded-full border border-[#E2C580]/55 bg-[linear-gradient(180deg,#6E7D45_0%,#56632F_100%)] py-1 pl-2 pr-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#F1D58F] shadow-[0_4px_12px_-4px_rgba(30,34,20,0.6),inset_0_1px_0_rgba(255,255,255,0.18)] [text-shadow:0_1px_0_rgba(30,34,20,0.45)] ${className}`}
    >
      <CrownIcon />
      Fundador
    </span>
  )
}

/** A small gold crown: the founders' mark. */
export function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-none drop-shadow-[0_0_4px_rgba(241,213,143,0.6)]" aria-hidden="true">
      <defs>
        <linearGradient id="founder-crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBE7A6" />
          <stop offset="0.55" stopColor="#E2C580" />
          <stop offset="1" stopColor="#B8893A" />
        </linearGradient>
      </defs>
      <path d="M3.5 8.5l4.2 3.6L12 5l4.3 7.1 4.2-3.6-1.7 9.5H5.2z" fill="url(#founder-crown)" />
      <rect x="5.2" y="18.6" width="13.6" height="2.2" rx="1" fill="url(#founder-crown)" />
      <circle cx="12" cy="4.6" r="1.3" fill="#FBE7A6" />
    </svg>
  )
}
