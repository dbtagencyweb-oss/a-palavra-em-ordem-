import { useEffect, useState, useSyncExternalStore } from 'react'
import { MyPlan } from '../access/MyPlan'
import { AnnualSwitchOffer } from '../access/PlanNotices'
import { FamilySection } from '../access/FamilySection'
import { useAuth } from '../auth/AuthContext'
import { AccountSettings } from '../auth/AccountSettings'
import { SignInForm } from '../auth/SignInForm'
import { PremiumAccountForm } from '../auth/PremiumAccountForm'
import { TOTAL_DAYS, ui } from '../content'
import { canPromptInstall, isStandalone, needsIosInstallGuide, onInstallAvailabilityChange, promptInstall } from '../pwa/install'
import { notificationStatus, requestPermission, type NotificationStatus } from '../reminder/notifications'
import { isValidTime, type ReminderPrefs } from '../reminder/reminder'
import { soundManager, useMuted } from '../sound/useSound'
import { useNarrationOn } from '../sound/useNarration'
import { useProgress } from '../store/ProgressContext'
import { useToast } from '../ui/Toast'

interface Props {
  reminder: ReminderPrefs
  onReminderChange(prefs: ReminderPrefs): void
  onShowIosGuide(): void
  onOffer(origem: string): void
  onDownloads(): void
  onStudies(): void
}

export function ProfileScreen({ reminder, onReminderChange, onShowIosGuide, onOffer, onDownloads, onStudies }: Props) {
  const { progress } = useProgress()
  const auth = useAuth()
  const toast = useToast()
  const muted = useMuted()
  const narrationOn = useNarrationOn()
  const [status, setStatus] = useState<NotificationStatus>(() => notificationStatus())
  const installable = useSyncExternalStore(onInstallAvailabilityChange, canPromptInstall)
  const diag = ui.diagnostico.opcoes.find((o) => o.id === progress.diagnosis)
  const done = Object.keys(progress.completedDays).length

  useEffect(() => {
    const refresh = () => setStatus(notificationStatus())
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])

  async function toggleReminder() {
    if (reminder.enabled) return onReminderChange({ ...reminder, enabled: false })
    if (status === 'needs-install') return onShowIosGuide()
    const s = await requestPermission()
    setStatus(s)
    if (s === 'granted') {
      onReminderChange({ ...reminder, enabled: true })
      toast(`Lembrete diário às ${reminder.time}`)
    }
  }

  return (
    <section className="screen pb-[calc(84px+env(safe-area-inset-bottom))]">
      <header className="px-5 pb-2 pt-[22px]">
        <h2 className="text-[26px]">Minha jornada</h2>
        {diag && <p className="mt-1.5 text-sm leading-normal text-ink-2">Ponto de partida: “{diag.texto}”</p>}
      </header>

      <dl className="mt-1">
        <Row label="Lâmpada acesa" value={`${progress.streak} ${progress.streak === 1 ? 'dia' : 'dias'}`} />
        <Row label="Graça disponível" value={String(progress.grace)} />
        <Row label="Passos na jornada" value={String(progress.steps)} />
        <Row label="Lições concluídas" value={`${done} de ${TOTAL_DAYS}`} />
        <Row label="Símbolos" value={`${progress.symbols.length} de ${TOTAL_DAYS}`} />
        <Row label="Registros no diário" value={String(progress.diary.length)} />
      </dl>

      <MyPlan onOffer={() => onOffer('perfil')} onDownloads={onDownloads} />
      <button type="button" onClick={onStudies} className="mx-5 mt-3 flex min-h-12 w-[calc(100%-2.5rem)] items-center justify-between rounded-btn border border-line bg-card px-4 text-left text-[14px] font-semibold">
        Estudos por livro <span className="text-ink-3" aria-hidden="true">›</span>
      </button>
      <AnnualSwitchOffer />
      <FamilySection />

      {auth.enabled && (
        <section className="mx-5 mt-6" aria-labelledby="minha-conta" data-testid="minha-conta">
          <h3 id="minha-conta" className="pb-2 text-lg">Minha conta</h3>
          {!auth.ready ? (
            <p role="status" className="text-sm text-ink-2">Verificando a sessão…</p>
          ) : auth.session ? (
            <AccountSettings key={auth.session.user.id} />
          ) : (
            <>
              <p className="mb-4 text-[13.5px] leading-normal text-ink-2">
                Se você comprou um plano, entre com o e-mail usado na compra. Sua jornada gratuita fica salva neste aparelho.
              </p>
              <PremiumAccountForm origem="perfil" />
              <details className="mt-3">
                <summary className="min-h-11 cursor-pointer py-3 text-sm text-ink-2">Já entrava por link ou Google?</summary>
                <SignInForm origem="perfil_link" />
              </details>
            </>
          )}
        </section>
      )}

      <h3 className="px-5 pb-1 pt-7 text-lg">Preferências</h3>
      <div className="mx-5">
        <SwitchRow
          label="Som"
          hint="Efeitos das lições e das conquistas"
          checked={!muted}
          onChange={() => {
            soundManager.toggleMuted()
            if (muted) soundManager.play('tap')
          }}
        />
        <SwitchRow
          label="Narração em voz"
          hint={muted ? 'Com o som desligado, as cenas mostram só a legenda' : 'Um narrador conta as cenas marcantes, com legenda'}
          checked={narrationOn}
          onChange={() => soundManager.setNarration(!narrationOn)}
        />
        <SwitchRow label="Lembrete diário" hint={reminderHint(status, reminder.enabled)} checked={reminder.enabled} onChange={toggleReminder} />
        {reminder.enabled && (
          <label className="flex min-h-[56px] items-center justify-between border-b border-line text-[14.5px]">
            <span>Horário do lembrete</span>
            <input
              type="time"
              value={reminder.time}
              onChange={(e) => isValidTime(e.target.value) && onReminderChange({ ...reminder, time: e.target.value })}
              className="min-h-[44px] rounded-lg border border-line bg-card px-3 font-bold text-ink"
            />
          </label>
        )}
        {status === 'needs-install' && (
          <button type="button" onClick={onShowIosGuide} className="mt-3 min-h-[44px] text-[13.5px] font-bold text-ember-ink">
            Como adicionar à tela inicial →
          </button>
        )}
      </div>

      {!isStandalone() && (installable || needsIosInstallGuide()) && (
        <div className="px-5 pb-2 pt-6">
          <button
            type="button"
            className="btn btn-ghost border-[1.5px] border-line"
            onClick={() => (installable ? void promptInstall() : onShowIosGuide())}
          >
            Instalar o app
          </button>
        </div>
      )}
      <div className="h-6" />
    </section>
  )
}

function reminderHint(status: NotificationStatus, enabled: boolean) {
  if (status === 'needs-install') return 'No iPhone, funciona com o app na tela inicial'
  if (status === 'unsupported') return 'Este navegador não mostra notificações'
  if (status === 'denied') return 'Notificações bloqueadas nas configurações do navegador'
  return enabled ? 'Um aviso por dia, se a lição ainda não foi feita' : 'Um aviso gentil no horário que você escolher'
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mx-5 flex justify-between border-b border-line py-4 text-[14.5px]">
      <dt>{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  )
}

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange(): void }) {
  return (
    <div className="flex min-h-[64px] items-center justify-between gap-4 border-b border-line py-3">
      <div>
        <div className="text-[14.5px]">{label}</div>
        <div className="mt-0.5 text-xs text-ink-3">{hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-sound="none"
        onClick={onChange}
        className={`relative h-[30px] w-[52px] flex-none rounded-full transition-colors ${checked ? 'bg-olive' : 'bg-line'}`}
      >
        <span className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-[left] ${checked ? 'left-[25px]' : 'left-[3px]'}`} />
      </button>
    </div>
  )
}
