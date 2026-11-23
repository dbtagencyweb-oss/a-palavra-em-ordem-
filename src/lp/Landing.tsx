// The sales landing page (/lp/). Sections follow docs/04-landing-page.md; copy lives in
// content/landing.json.
import { Corner, FounderStrip, JourneyBar, MobileBuyBar } from './chrome/Chrome'
import { HeroBookBand } from './HeroBook'
import { useOffer } from './oferta'
import { usePublico } from './publico'
import { useWide } from './useWide'
import { AppInside } from './sections/AppInside'
import { Audience } from './sections/Audience'
import { Compare } from './sections/Compare'
import { Demo } from './sections/Demo'
import { ExitIntent, Faq, Finale, Offer } from './sections/Closing'
import { Game } from './sections/Game'
import { Hero } from './sections/Hero'
import { Mechanism } from './sections/Mechanism'
import { ForWhom, Journey, Verse } from './sections/Middle'
import { Pain } from './sections/Pain'
import { Preloader } from './sections/Preloader'
import { Turn } from './sections/Turn'

export function Landing() {
  // Re-render on the audience choice: links to the app carry it, and the pain section is rebuilt.
  const publico = usePublico()
  const wide = useWide()
  // Re-render when the Founder count changes: prices, links and the offer follow it.
  useOffer()
  return (
    <>
      <Preloader />
      <JourneyBar />
      <Corner />
      <main>
        <Hero />
        {!wide && <HeroBookBand />}
        <Audience />
        <Pain key={publico ?? 'padrao'} />
        <Compare />
        <Turn />
        <Mechanism />
        <Game />
        <AppInside />
        <Demo />
        <Verse />
        <Journey />
        <ForWhom />
        <Offer />
        <Faq />
        <Finale />
      </main>
      <FounderStrip />
      <MobileBuyBar />
      <ExitIntent />
    </>
  )
}
