import { soundManager, useMuted } from '../sound/useSound'

export function SoundToggle({ className = '' }: { className?: string }) {
  const muted = useMuted()
  return (
    <button
      type="button"
      data-sound="none"
      onClick={() => {
        soundManager.toggleMuted()
        if (muted) soundManager.play('tap')
      }}
      aria-pressed={!muted}
      aria-label={muted ? 'Ligar o som' : 'Desligar o som'}
      className={`grid h-11 w-11 flex-none place-items-center rounded-full ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none" />
        {muted ? (
          <path d="M17 9l5 6M22 9l-5 6" />
        ) : (
          <>
            <path d="M16.5 8.5a5 5 0 010 7" />
            <path d="M19 6a8.5 8.5 0 010 12" />
          </>
        )}
      </svg>
    </button>
  )
}
