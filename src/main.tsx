import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { PrintPage } from './print/PrintPage'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { capturePublico } from './analytics/publico'
import { supabaseSink } from './analytics/supabaseSink'
import { track, tracker } from './analytics/track'
import { AccessProvider } from './access/AccessContext'
import { AuthProvider } from './auth/AuthContext'
import { getSupabase } from './lib/supabase'
import { listenForInstallPrompt } from './pwa/install'
import { HowlerBackend } from './sound/HowlerBackend'
import { soundManager } from './sound/SoundManager'
import { ProgressProvider } from './store/ProgressContext'
import { ToastProvider } from './ui/Toast'

soundManager.setBackend(new HowlerBackend())
capturePublico() // the landing page audience, for the diagnosis
registerSW({ immediate: true })
listenForInstallPrompt()

// Analytics loads the Supabase client on its first flush, after the first screen is up.
const sb = getSupabase()
if (sb) tracker.setSink(async (events) => supabaseSink(await sb)(events))
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && void tracker.flush())
soundManager.subscribe(() => track('sound_toggled', { ligado: !soundManager.muted }))

if (import.meta.env.DEV) {
  // Dev aid: window.__soundLog lists what played, to check the rhythm without speakers.
  const log: string[] = []
  const w = window as unknown as { __soundLog: string[]; __sound: typeof soundManager }
  w.__soundLog = log
  w.__sound = soundManager
  const play = soundManager.play.bind(soundManager)
  soundManager.play = (id) => {
    if (soundManager.isUnlocked && !soundManager.muted) log.push(id)
    play(id)
  }
  const amb = soundManager.startAmbient.bind(soundManager)
  soundManager.startAmbient = (id) => {
    log.push(`ambient:${id}`)
    amb(id)
  }
}

// Audio unlocks on the first interaction (iOS). Nothing plays before it.
const unlock = () => soundManager.unlock()
window.addEventListener('pointerdown', unlock, { once: true, capture: true })
window.addEventListener('keydown', unlock, { once: true, capture: true })

// Default "tap" for every button and link. Elements with data-sound play their own sound instead.
document.addEventListener(
  'click',
  (e) => {
    const el = (e.target as Element | null)?.closest('button, a[href]')
    if (!el || el.closest('[data-sound]') || (el as HTMLButtonElement).disabled) return
    soundManager.play('tap')
  },
  { capture: true },
)

// Print pages (/print/...) render alone: no phone frame, no opening, no account (npm run print:export).
const printRoute = window.location.pathname.match(/^\/print\/([\w-]+)/)?.[1]

createRoot(document.getElementById('root')!).render(
  printRoute ? (
    <StrictMode>
      <PrintPage route={printRoute} />
    </StrictMode>
  ) : (
  <StrictMode>
    <div className="device">
      <AuthProvider>
        <AccessProvider>
          <ProgressProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </ProgressProvider>
        </AccessProvider>
      </AuthProvider>
    </div>
  </StrictMode>
  ),
)
