// GSAP + ScrollTrigger + Lenis setup for the landing page (none of this ships with the app).
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Fired when the preloader has opened onto the hero. */
export const READY_EVENT = 'lp:ready'
let ready = false
export function markReady() {
  ready = true
  window.dispatchEvent(new Event(READY_EVENT))
}
export function onReady(fn: () => void) {
  if (ready) {
    fn()
    return () => {}
  }
  window.addEventListener(READY_EVENT, fn, { once: true })
  return () => window.removeEventListener(READY_EVENT, fn)
}

/** Fired when the hero title has finished revealing (the book starts opening then). */
export const TITLE_DONE_EVENT = 'lp:title-done'
let titleDone = false
export function markTitleDone() {
  if (titleDone) return
  titleDone = true
  window.dispatchEvent(new Event(TITLE_DONE_EVENT))
}
export function onTitleDone(fn: () => void) {
  if (titleDone) {
    fn()
    return () => {}
  }
  window.addEventListener(TITLE_DONE_EVENT, fn, { once: true })
  return () => window.removeEventListener(TITLE_DONE_EVENT, fn)
}

/** Smooth scrolling driven by GSAP's ticker, so ScrollTrigger and Lenis stay in step. */
let lenisRef: Lenis | null = null

/** Smooth scroll to an element (through Lenis when it runs, so the two never fight). */
export function scrollToEl(el: Element, offset = 0) {
  if (lenisRef) lenisRef.scrollTo(el as HTMLElement, { duration: 1.2, offset })
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reducedMotion() ? 'auto' : 'smooth' })
}

export function startSmoothScroll() {
  if (reducedMotion()) return null
  const lenis = new Lenis({ lerp: 0.11, smoothWheel: true })
  lenisRef = lenis
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}
