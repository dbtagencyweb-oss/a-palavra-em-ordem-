import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { track } from './analytics/track'
import { useAuth } from './auth/AuthContext'
import { isDayCompleted, isDayUnlocked, type CompletionResult } from './game/progress'
import { needsIosInstallGuide } from './pwa/install'
import { syncReminder } from './reminder/notifications'
import { loadReminder, saveReminder, type ReminderPrefs } from './reminder/reminder'
import { buildReminderState, journeyNext, lastCompletedAny } from './reminder/state'
import { toDateKey } from './game/dates'
import { CollectionScreen } from './screens/CollectionScreen'
import { presetDiagnosis } from './analytics/publico'
import { DiagnosisScreen } from './screens/DiagnosisScreen'
import { DiaryScreen } from './screens/DiaryScreen'
import { GuideScreen } from './screens/GuideScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { SaveJourneyScreen } from './screens/SaveJourneyScreen'
import { ThankYouScreen } from './screens/ThankYouScreen'
import { useCloudSync } from './store/useCloudSync'
import { DoneScreen } from './screens/DoneScreen'
import { HomeScreen } from './screens/HomeScreen'
import { LessonScreen } from './screens/LessonScreen'
import { BibliaScreen } from './screens/BibliaScreen'
import { DownloadsScreen } from './screens/DownloadsScreen'
import { InviteScreen, PENDING_INVITE } from './screens/InviteScreen'
import { announceNewEtapas } from './access/etapaNotices'
import { useFounder } from './auth/useFounder'
import { useToast } from './ui/Toast'
import { isStudy, trailById } from './content/trails'
import { StudiesScreen, StudyScreen } from './screens/StudiesScreen'
import { GroupScreen } from './screens/GroupScreen'
import { AdminScreen } from './screens/AdminScreen'
import { GroupJoinScreen, PENDING_GROUP } from './screens/GroupJoinScreen'
import { IntroScreen } from './screens/IntroScreen'
import { Splash } from './screens/Splash'
import { RecommendationScreen } from './screens/RecommendationScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { useProgress } from './store/ProgressContext'
import { BottomNav, type Tab } from './ui/BottomNav'
import { IosInstallGuide } from './ui/IosInstallGuide'
import { Leaving } from './ui/Leaving'
import { DevPanel } from './ui/DevPanel'
import { OfferSheet } from './ui/OfferSheet'
import { useScreenMotion } from './ui/motion'
import { soundManager } from './sound/SoundManager'

type Route =
  | { name: 'welcome' }
  | { name: 'intro' }
  | { name: 'diag' }
  | { name: 'rec' }
  | { name: 'home' }
  | { name: 'collection' }
  | { name: 'diary' }
  | { name: 'guide' }
  | { name: 'profile' }
  | { name: 'save' }
  | { name: 'obrigado' }
  | { name: 'biblia' }
  | { name: 'downloads' }
  | { name: 'estudos' }
  | { name: 'grupo' }
  | { name: 'admin' }
  | { name: 'igreja'; codigo: string }
  | { name: 'estudo'; id: string }
  | { name: 'convite'; codigo: string }
  | { name: 'lesson'; day: number; trail?: string }
  | { name: 'done'; day: number; result: CompletionResult; trail?: string }

export function App() {
  const { progress, update, completeDay, today } = useProgress()
  const auth = useAuth()
  useCloudSync()
  // /obrigado is where the payment platform sends the buyer after checkout.
  const [route, setRoute] = useState<Route>(() =>
    window.location.pathname.replace(/\/$/, '') === '/obrigado' ? { name: 'obrigado' } :
    window.location.pathname.replace(/\/$/, '') === '/downloads' ? { name: 'downloads' } :
    window.location.pathname.startsWith('/estudos') && progress.started ? { name: 'estudos' } :
    window.location.pathname.replace(/\/$/, '') === '/grupo' ? { name: 'grupo' } :
    window.location.pathname.replace(/\/$/, '') === '/admin' ? { name: 'admin' } :
    /^\/igreja\/[\w-]+/.test(window.location.pathname) ? { name: 'igreja', codigo: window.location.pathname.split('/')[2] } :
    /^\/convite\/[\w-]+/.test(window.location.pathname) ? { name: 'convite', codigo: window.location.pathname.split('/')[2] } : progress.started ? { name: 'home' } : { name: 'welcome' },
  )
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerOrigin, setOfferOrigin] = useState('home')
  const openOffer = useCallback((origem: string) => {
    soundManager.play('offer_open')
    setOfferOrigin(origem)
    setOfferOpen(true)
  }, [])
  const screenMotion = useScreenMotion()
  const closeOffer = useCallback(() => setOfferOpen(false), [])
  const [reminder, setReminder] = useState<ReminderPrefs>(loadReminder)
  const [iosGuide, setIosGuide] = useState(false)
  // Quick opening on every app open; the current screen mounts underneath meanwhile.
  const [splash, setSplash] = useState(true)

  // Keep the daily reminder in step with progress and preferences.
  // Retention messages (docs/07, Prompt 11): refreshed each time the app opens or progress changes.
  const paidAccess = useFounder()
  useEffect(() => {
    void syncReminder(buildReminderState(progress, reminder, toDateKey(new Date()), paidAccess))
  }, [reminder, progress, paidAccess])

  function changeReminder(prefs: ReminderPrefs) {
    saveReminder(prefs)
    setReminder(prefs)
  }

  // Back from the sign-in that an invite link started (magic link / Google land on "/"): finish it.
  useEffect(() => {
    if (!auth.session) return
    let code: string | null = null
    try {
      code = localStorage.getItem(PENDING_INVITE)
    } catch {
      /* ignore */
    }
    if (code) setRoute({ name: 'convite', codigo: code })
    let group: string | null = null
    try {
      group = localStorage.getItem(PENDING_GROUP)
    } catch {
      /* ignore */
    }
    if (group) setRoute({ name: 'igreja', codigo: group })
  }, [auth.session])

  // Founders hear about a new stage of A Bíblia em Ordem once, the next time the app opens.
  const founder = useFounder()
  const toastMsg = useToast()
  useEffect(() => {
    if (!founder) return
    // After the 2-second opening, so the notice is actually seen.
    const id = window.setTimeout(() => announceNewEtapas(true, toastMsg), 2600)
    return () => window.clearTimeout(id)
  }, [founder, toastMsg])

  // "Zerar progresso" (dev) sends the user back to the start.
  useEffect(() => {
    if (!progress.started && isTab(route.name)) setRoute({ name: 'welcome' })
  }, [progress.started, route.name])

  const go = (r: Route) => setRoute(r)

  // Back from the magic link / Google while on "Salve sua jornada": continue the journey.
  useEffect(() => {
    if (auth.session && route.name === 'save') setRoute({ name: 'home' })
  }, [auth.session, route.name])

  // Where a lesson returns to: the plan, the study, or the journey.
  const backFrom = (trail?: string): Route =>
    trail === 'biblia-em-ordem' ? { name: 'biblia' } : trail && isStudy(trail) ? { name: 'estudo', id: trail } : { name: 'home' }

  function openDay(day: number, trail?: string) {
    track('day_start', { dia: day, revisao: isDayCompleted(progress, day, trail), trilha: trail })
    go({ name: 'lesson', day, trail })
  }

  function leaveDone() {
    // After Day 1, invite to create an account ("Salve sua jornada") once.
    if (route.name === 'done' && route.day === 1 && !route.trail && route.result.firstTime && auth.enabled && !auth.session) {
      go({ name: 'save' })
      return
    }
    goHomeAfterLesson()
  }

  // After the first lesson on an iPhone browser, teach "add to home screen" once.
  function goHomeAfterLesson() {
    // A reading of A Bíblia em Ordem returns to the plan; everything else to the journey.
    go(route.name === 'done' ? backFrom(route.trail) : { name: 'home' })
    const KEY = 'pao:ios-guide-shown'
    try {
      if (needsIosInstallGuide() && !localStorage.getItem(KEY)) {
        localStorage.setItem(KEY, '1')
        window.setTimeout(() => setIosGuide(true), 600)
      }
    } catch {
      /* ignore */
    }
  }
  const routeKey = route.name === 'lesson' || route.name === 'done' ? `${route.name}-${route.trail ?? ''}${route.day}` : route.name

  let screen: React.ReactNode
  switch (route.name) {
    case 'welcome':
      screen = (
        <WelcomeScreen
          onStart={() => {
            track('onboarding_start')
            go(progress.introSeen ? { name: 'diag' } : { name: 'intro' })
          }}
          onHasAccount={() => {
            update((p) => ({ ...p, started: true, diagnosis: p.diagnosis ?? 'perco' }))
            go({ name: 'home' })
          }}
        />
      )
      break
    case 'intro':
      screen = (
        <IntroScreen
          onDone={() => {
            update((p) => ({ ...p, introSeen: true }))
            go({ name: 'diag' })
          }}
        />
      )
      break
    case 'diag':
      screen = (
        <DiagnosisScreen
          initial={progress.diagnosis ?? presetDiagnosis()}
          onBack={() => go({ name: 'welcome' })}
          onNext={(id) => {
            update((p) => ({ ...p, diagnosis: id }))
            track('diagnosis_answered', { opcao: id })
            go({ name: 'rec' })
          }}
        />
      )
      break
    case 'rec':
      screen = (
        <RecommendationScreen
          diagnosis={progress.diagnosis}
          onBack={() => go({ name: 'diag' })}
          onStart={() => {
            update((p) => ({ ...p, started: true }))
            openDay(1)
          }}
        />
      )
      break
    case 'home':
      screen = (
        <HomeScreen
          onOpenDay={openDay}
          onOffer={openOffer}
          onCollection={() => go({ name: 'collection' })}
          onBiblia={() => go({ name: 'biblia' })}
          onStudies={() => go({ name: 'estudos' })}
          onGroup={() => go({ name: 'grupo' })}
        />
      )
      break
    case 'convite':
      screen = (
        <InviteScreen
          codigo={route.codigo}
          onStart={() => {
            window.history.replaceState(null, '', '/')
            update((p) => ({ ...p, started: true }))
            go({ name: 'home' })
          }}
        />
      )
      break
    case 'downloads':
      screen = (
        <DownloadsScreen
          onBack={() => {
            if (window.location.pathname !== '/') window.history.replaceState(null, '', '/')
            go(progress.started ? { name: 'profile' } : { name: 'welcome' })
          }}
        />
      )
      break
    case 'biblia':
      screen = <BibliaScreen onBack={() => go({ name: 'home' })} onOpenDay={(n) => openDay(n, 'biblia-em-ordem')} onOffer={openOffer} />
      break
    case 'admin':
      screen = (
        <AdminScreen
          onBack={() => {
            window.history.replaceState(null, '', '/')
            go(progress.started ? { name: 'home' } : { name: 'welcome' })
          }}
        />
      )
      break
    case 'grupo':
      screen = (
        <GroupScreen
          onBack={() => {
            if (window.location.pathname !== '/') window.history.replaceState(null, '', '/')
            go(progress.started ? { name: 'home' } : { name: 'welcome' })
          }}
        />
      )
      break
    case 'igreja':
      screen = (
        <GroupJoinScreen
          codigo={route.codigo}
          onStart={() => {
            window.history.replaceState(null, '', '/')
            update((p) => ({ ...p, started: true }))
            go({ name: 'home' })
          }}
        />
      )
      break
    case 'estudos':
      screen = (
        <StudiesScreen
          onBack={() => {
            if (window.location.pathname !== '/') window.history.replaceState(null, '', '/')
            go({ name: 'home' })
          }}
          onOpenStudy={(id) => go({ name: 'estudo', id })}
        />
      )
      break
    case 'estudo':
      screen = <StudyScreen id={route.id} onBack={() => go({ name: 'estudos' })} onOpenDay={(n) => openDay(n, route.id)} />
      break
    case 'collection':
      screen = <CollectionScreen onBack={() => go({ name: 'home' })} />
      break
    case 'diary':
      screen = <DiaryScreen />
      break
    case 'guide':
      screen = <GuideScreen />
      break
    case 'obrigado':
      screen = (
        <ThankYouScreen
          onDownloads={() => {
            window.history.replaceState(null, '', '/downloads')
            go({ name: 'downloads' })
          }}
          onEnter={() => {
            window.history.replaceState(null, '', '/')
            update((p) => ({ ...p, started: true }))
            go(progress.started ? { name: 'home' } : { name: 'welcome' })
          }}
        />
      )
      break
    case 'save':
      screen = <SaveJourneyScreen onSkip={goHomeAfterLesson} />
      break
    case 'profile':
      screen = <ProfileScreen reminder={reminder} onReminderChange={changeReminder} onShowIosGuide={() => setIosGuide(true)} onOffer={openOffer} onDownloads={() => go({ name: 'downloads' })} onStudies={() => go({ name: 'estudos' })} />
      break
    case 'lesson':
      screen = (
        <LessonScreen
          dayN={route.day}
          trail={trailById(route.trail)}
          onExit={() => go(backFrom(route.trail))}
          onOffer={openOffer}
          onFinish={(firstTries, early) => {
            const result = early ?? completeDay(route.day, firstTries, trailById(route.trail))
            track('day_complete', { dia: route.day, primeiraVez: result.firstTime, trilha: route.trail })
            go({ name: 'done', day: route.day, result, trail: route.trail })
          }}
        />
      )
      break
    case 'done':
      screen = <DoneScreen dayN={route.day} trail={trailById(route.trail)} result={route.result} onHome={leaveDone} />
      break
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={routeKey}
          className="flex min-h-0 flex-1 flex-col"
          variants={screenMotion.variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={screenMotion.transition}
        >
          <Leaving>{screen}</Leaving>
        </motion.div>
      </AnimatePresence>
      {isTab(route.name) && (
        <BottomNav
          current={route.name}
          onChange={(tab) => go({ name: tab })}
          litToday={lastCompletedAny(progress) === today}
          onToday={() => {
            // The flame: the next lesson of the journey (Mapa, then the paid trails with access).
            const at = journeyNext(progress, paidAccess)
            const trailId = at && at.trail.id !== 'mapa-7-dias' ? at.trail.id : undefined
            if (at && isDayUnlocked(progress, at.next.n, today, at.trail.id)) return openDay(at.next.n, trailId)
            go({ name: 'home' })
            toastMsg(lastCompletedAny(progress) === today ? 'Lâmpada acesa hoje. A próxima lição libera amanhã.' : 'Sua próxima lição libera amanhã.')
          }}
        />
      )}
      <OfferSheet open={offerOpen} origem={offerOrigin} onClose={closeOffer} />
      <IosInstallGuide open={iosGuide} onClose={() => setIosGuide(false)} />
      {import.meta.env.DEV && <DevPanel />}
      {splash && <Splash onDone={() => setSplash(false)} />}
    </MotionConfig>
  )
}

const isTab = (name: string): name is Tab => name === 'home' || name === 'diary' || name === 'guide' || name === 'profile'
