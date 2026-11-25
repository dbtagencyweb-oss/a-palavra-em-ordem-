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
import { AccountScreen } from './screens/AccountScreen'
import { ThankYouScreen } from './screens/ThankYouScreen'
import { useCloudSync } from './store/useCloudSync'
import { DoneScreen } from './screens/DoneScreen'
import { HomeScreen } from './screens/HomeScreen'
import { LessonScreen } from './screens/LessonScreen'
import { BibleLibraryScreen } from './screens/BibleLibraryScreen'
import { DownloadsScreen } from './screens/DownloadsScreen'
import { InviteScreen, PENDING_INVITE } from './screens/InviteScreen'
import { announceNewEtapas } from './access/etapaNotices'
import { useFounder } from './auth/useFounder'
import { useToast } from './ui/Toast'
import { isStudy, JESUS, MAPA, trailById } from './content/trails'
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
import { BibleLookup } from './ui/BibleLookup'
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
  | { name: 'entrar' }
  | { name: 'ativar-conta' }
  | { name: 'recuperar-senha' }
  | { name: 'obrigado' }
  | { name: 'biblia'; tab?: 'progresso' }
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
    window.location.pathname.replace(/\/$/, '') === '/entrar' ? { name: 'entrar' } :
    window.location.pathname.replace(/\/$/, '') === '/ativar-conta' ? { name: 'ativar-conta' } :
    window.location.pathname.replace(/\/$/, '') === '/recuperar-senha' ? { name: 'recuperar-senha' } :
    window.location.pathname.replace(/\/$/, '') === '/downloads' ? { name: 'downloads' } :
    window.location.pathname.startsWith('/estudos') && progress.started ? { name: 'estudos' } :
    window.location.pathname.replace(/\/$/, '') === '/grupo' ? { name: 'grupo' } :
    window.location.pathname.replace(/\/$/, '') === '/admin' ? { name: 'admin' } :
    /^\/igreja\/[\w-]+/.test(window.location.pathname) ? { name: 'igreja', codigo: window.location.pathname.split('/')[2] } :
    /^\/convite\/[\w-]+/.test(window.location.pathname) ? { name: 'convite', codigo: window.location.pathname.split('/')[2] } : progress.started ? { name: 'home' } : { name: 'welcome' },
  )
  const [offerOpen, setOfferOpen] = useState(false)
  const [bibleLookupOpen, setBibleLookupOpen] = useState(false)
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
    if (/^\/(entrar|ativar-conta|recuperar-senha|obrigado)\/?$/.test(window.location.pathname)) return
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

  // Where a lesson returns to: the plan, the study, or the journey.
  const backFrom = (trail?: string): Route =>
    trail === 'biblia-em-ordem' ? { name: 'biblia', tab: 'progresso' } : trail && isStudy(trail) ? { name: 'estudo', id: trail } : { name: 'home' }

  function openDay(day: number, trail?: string) {
    if (trail === JESUS.id && !paidAccess) {
      openOffer('jesus_em_ordem')
      return
    }
    track('day_start', { dia: day, revisao: isDayCompleted(progress, day, trail), trilha: trail })
    go({ name: 'lesson', day, trail })
  }

  function continueWithJesus(origin: string) {
    if (!paidAccess) {
      openOffer(origin)
      return
    }
    const next = JESUS.visible.find((day) => day.status === 'publicado' && !isDayCompleted(progress, day.n, JESUS.id))
    if (!next) {
      toastMsg('Você está em dia com as lições disponíveis de Jesus em Ordem.')
      return
    }
    if (!isDayUnlocked(progress, next.n, today, JESUS.id)) {
      toastMsg('A próxima lição libera amanhã.')
      return
    }
    openDay(next.n, JESUS.id)
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
          onHasAccount={() => go({ name: 'entrar' })}
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
          onContinueJesus={() => continueWithJesus('home')}
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
      screen = <BibleLibraryScreen initialTab={route.tab} onBack={() => go({ name: 'home' })} onOpenDay={(n) => openDay(n, 'biblia-em-ordem')} onOffer={openOffer} />
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
          onSetPassword={() => go({ name: 'ativar-conta' })}
          onOpenJesus={() => {
            window.history.replaceState(null, '', '/')
            update((p) => ({ ...p, started: true }))
            go({ name: 'home' })
            continueWithJesus('obrigado')
          }}
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
    case 'entrar':
    case 'ativar-conta':
    case 'recuperar-senha':
      screen = (
        <AccountScreen
          key={route.name}
          purpose={route.name === 'ativar-conta' ? 'activation' : route.name === 'recuperar-senha' ? 'recovery' : undefined}
          onBack={() => {
            const backToPurchase = route.name === 'ativar-conta' && !!auth.session
            window.history.replaceState(null, '', backToPurchase ? '/obrigado' : '/')
            go({ name: backToPurchase ? 'obrigado' : progress.started ? 'home' : 'welcome' })
          }}
          onDone={() => {
            const backToPurchase = route.name === 'ativar-conta'
            window.history.replaceState(null, '', backToPurchase ? '/obrigado' : '/')
            if (!backToPurchase) update((p) => ({ ...p, started: true, diagnosis: p.diagnosis ?? 'perco' }))
            go({ name: backToPurchase ? 'obrigado' : 'home' })
          }}
        />
      )
      break
    case 'profile':
      screen = <ProfileScreen reminder={reminder} onReminderChange={changeReminder} onShowIosGuide={() => setIosGuide(true)} onOffer={openOffer} onDownloads={() => go({ name: 'downloads' })} onStudies={() => go({ name: 'estudos' })} />
      break
    case 'lesson':
      screen = (
        <LessonScreen
          key={`${route.trail ?? 'mapa'}-${route.day}`}
          dayN={route.day}
          trail={trailById(route.trail)}
          onExit={() => go(backFrom(route.trail))}
          onOffer={openOffer}
          onOpenDay={(n) => openDay(n, route.trail)}
          onFinish={(firstTries, early) => {
            const result = early ?? completeDay(route.day, firstTries, trailById(route.trail))
            track('day_complete', { dia: route.day, primeiraVez: result.firstTime, trilha: route.trail })
            go({ name: 'done', day: route.day, result, trail: route.trail })
          }}
        />
      )
      break
    case 'done':
      screen = <DoneScreen dayN={route.day} trail={trailById(route.trail)} result={route.result} onHome={goHomeAfterLesson}
        onContinueJesus={!route.trail && route.day === MAPA.total ? () => continueWithJesus('conclusao_dia_7') : undefined} />
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
          onSearch={() => setBibleLookupOpen(true)}
        />
      )}
      <BibleLookup open={bibleLookupOpen} onClose={() => setBibleLookupOpen(false)} onToday={() => {
        const at = journeyNext(progress, paidAccess)
        const trailId = at && at.trail.id !== MAPA.id ? at.trail.id : undefined
        if (at && isDayUnlocked(progress, at.next.n, today, at.trail.id)) return openDay(at.next.n, trailId)
        go({ name: 'home' })
        toastMsg(lastCompletedAny(progress) === today ? 'Lâmpada acesa hoje. A próxima lição libera amanhã.' : 'Sua próxima lição libera amanhã.')
      }} />
      <OfferSheet open={offerOpen} origem={offerOrigin} onClose={closeOffer} />
      <IosInstallGuide open={iosGuide} onClose={() => setIosGuide(false)} />
      {import.meta.env.DEV && <DevPanel />}
      {splash && <Splash onDone={() => setSplash(false)} />}
    </MotionConfig>
  )
}

const isTab = (name: string): name is Tab => name === 'home' || name === 'diary' || name === 'guide' || name === 'profile'
