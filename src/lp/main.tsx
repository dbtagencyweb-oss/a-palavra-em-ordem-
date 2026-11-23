import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './lp.css'
import { Landing } from './Landing'
import { startSmoothScroll } from './motion'
import { initPixel, pixel, trackScrollDepth } from './pixel'
import { getOffer, startSeats } from './oferta'
import { publicoTag } from './publico'
import { lpSound } from './state'
import { lpEvent } from './track'

initPixel()
startSeats()
pixel('ViewContent', { content_name: 'Acesso Fundador', value: getOffer().preco, currency: 'BRL', publico: publicoTag() })
trackScrollDepth()
lpEvent('lp_view')
startSmoothScroll()

// Audio unlocks on the first interaction (it stays muted until the visitor turns it on).
window.addEventListener('pointerdown', () => lpSound.unlock(), { once: true, capture: true })

createRoot(document.getElementById('lp')!).render(
  <StrictMode>
    <Landing />
  </StrictMode>,
)
