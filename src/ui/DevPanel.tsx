import { useState } from 'react'
import { DEV_PAYMENTS, resetDevEntitlements } from '../access/devPayments'
import { devAcceptInvite, devResetFamily } from '../access/family'
import { devAddChurchMember, devJoinChurchGroup, devResetGroup } from '../access/group'
import { cloudEnabled } from '../lib/supabase'
import { devUnlockAll, setDevUnlockAll } from '../dev/unlockAll'
import { TOTAL_DAYS } from '../content'
import { isDayCompleted, isDayUnlocked, nextDay } from '../game/progress'
import { JESUS, MAPA, type Trail } from '../content/trails'
import { useProgress } from '../store/ProgressContext'
import { useToast } from './Toast'

/**
 * Developer-only dock (rendered only when import.meta.env.DEV), reachable from every screen:
 * a small "DEV" pill that opens the testing controls.
 */
export function DevPanel() {
  const { progress, today, devDayOffset, devAdvanceDay, devReset, completeDay } = useProgress()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [pay, setPay] = useState(false)
  // The day the journey is on: Trilha 1, then (once it is finished) Trilha 2.
  const mapNext = nextDay(progress, TOTAL_DAYS)
  const trail: Trail = mapNext === null ? JESUS : MAPA
  const next = mapNext ?? JESUS.visible.find((d) => !isDayCompleted(progress, d.n, JESUS.id))?.n ?? null
  const nextOpen = next !== null && isDayUnlocked(progress, next, today, trail.id)
  const where = trail.id === MAPA.id ? '' : `${trail.titulo} · `

  const btn = 'min-h-[44px] rounded-lg border border-white/15 bg-white/10 px-3 text-left font-bold text-paper'

  return (
    <div className="absolute left-1.5 top-1 z-[60]" data-sound="none">
      {open ? (
        <div className="max-h-[calc(100dvh-16px)] w-[230px] overflow-y-auto rounded-xl bg-ink/95 p-3 text-xs text-paper shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <b className="uppercase tracking-[0.12em] text-gold">Dev</b>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar painel de dev" className="grid h-8 w-8 place-items-center rounded-md text-paper/70">
              ✕
            </button>
          </div>
          <p className="mb-2.5 text-paper/70">
            Hoje simulado: <b className="text-paper">{today}</b>
            {devDayOffset ? ` (+${devDayOffset})` : ''}
            <br />
            Próximo: {next === null ? 'trilhas concluídas' : `${where}Dia ${next} ${nextOpen ? '(liberado)' : '(amanhã)'}`}
          </p>
          <div className="grid gap-1.5">
            <button
              type="button"
              className={`${btn} flex items-center justify-between ${devUnlockAll() ? '!border-gold/60 !bg-gold/20' : ''}`}
              aria-pressed={devUnlockAll()}
              onClick={() => {
                // Reload so every screen reads the new rule from the start.
                setDevUnlockAll(!devUnlockAll())
                window.location.reload()
              }}
            >
              Liberar tudo <span className="text-gold">{devUnlockAll() ? 'ligado' : 'desligado'}</span>
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                // One tap = one day of the journey: finish the open lesson (the map walks to the next
                // node on Home), then move the calendar so the next one unlocks.
                if (nextOpen && next !== null) {
                  completeDay(next, 0, trail)
                  toast(`${where}Dia ${next} concluído · amanhã simulado`)
                } else toast('Avançou um dia')
                devAdvanceDay()
              }}
            >
              Avançar um dia
            </button>
            <button
              type="button"
              className={btn}
              disabled={!nextOpen}
              onClick={() => {
                if (next === null) return
                completeDay(next, 0, trail)
                toast(`${where}Dia ${next} marcado como concluído`)
              }}
            >
              Concluir o dia liberado
            </button>
            <button
              type="button"
              className={`${btn} text-ember-soft`}
              onClick={() => {
                if (window.confirm('Zerar todo o progresso local?')) void devReset()
              }}
            >
              Zerar progresso
            </button>
          </div>
          {!cloudEnabled && (
            <div className="mt-3 border-t border-white/10 pt-2.5">
              <button type="button" className="mb-1.5 flex min-h-[36px] w-full items-center justify-between font-bold uppercase tracking-[0.12em] text-gold" onClick={() => setPay(!pay)} aria-expanded={pay}>
                Simular pagamento <span aria-hidden="true">{pay ? '−' : '+'}</span>
              </button>
              {pay && (
                <div className="grid gap-1.5">
                  {DEV_PAYMENTS.map((p) => (
                    <button key={p.label} type="button" className={btn} onClick={() => toast(p.run())}>
                      {p.label}
                    </button>
                  ))}
                  <button type="button" className={btn} onClick={() => toast(devAcceptInvite())}>
                    Família: simular aceite do convite
                  </button>
                  <button type="button" className={btn} onClick={() => toast(devAddChurchMember())}>
                    Igreja: alguém entra no meu grupo
                  </button>
                  <button type="button" className={btn} onClick={() => toast(devJoinChurchGroup())}>
                    Igreja: eu entro num grupo
                  </button>
                  <button
                    type="button"
                    className={`${btn} text-ember-soft`}
                    onClick={() => {
                      devResetFamily()
                      devResetGroup()
                      resetDevEntitlements()
                      toast('Compras simuladas apagadas')
                    }}
                  >
                    Apagar compras simuladas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir painel de dev"
          className="relative grid h-[18px] place-items-center rounded-full bg-ink/70 px-2 text-[9px] font-bold tracking-[0.12em] text-gold shadow-card after:absolute after:-inset-3 after:content-['']"
        >
          DEV
        </button>
      )}
    </div>
  )
}
