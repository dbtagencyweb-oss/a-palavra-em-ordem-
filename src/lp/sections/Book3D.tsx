// A Bible as a 3D mockup (CSS 3D, no images): it lies closed, then the cover and a few leaves
// turn over the spine and light rises from the open pages. Hardcover boards overhang the pages,
// both page blocks show their edges, the pages dip into a crease at the spine and a rounded spine
// shows at the bottom edge. The pages show the map of the story (no Bible text). It follows the
// mouse with a slight tilt and floats gently. Reduced motion: shown already open, still.
import { useLayoutEffect, useRef } from 'react'
import landing from '../../../content/landing.json'
import { eraOf } from '../../ui/eras'
import { Logo } from '../../ui/Logo'
import { gsap, onReady, reducedMotion } from '../motion'
import { lpSound } from '../state'

const blocos = landing.mecanismo.blocos
const labels = landing.hero.livro
const color = (i: number) => (blocos[i].nome === 'Exílio' ? '#8B7BB0' : eraOf(blocos[i].dia).mid)

/** Where the twinkles sparkle around the closed cover (left, top). */
const TWINKLES: [string, string][] = [
  ['-4%', '12%'], ['102%', '28%'], ['18%', '-3%'], ['96%', '-2%'], ['104%', '78%'], ['-5%', '64%'], ['60%', '101%'],
]

/** Right page: the seven blocks of the story along a winding path. */
function MapPage() {
  const pts = [
    [22, 86], [68, 75], [30, 62], [76, 50], [26, 37], [70, 24], [44, 11],
  ]
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-[9%] h-[82%] w-[82%] overflow-visible" aria-hidden="true">
      <path d={d} fill="none" stroke="#B8893A" strokeWidth="0.9" strokeDasharray="1.6 1.8" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.4" fill={color(i)} stroke="#FFFCF6" strokeWidth="1" />
          <text x={x + (x > 50 ? 5.5 : -5.5)} y={y + 1.7} fontSize="5.4" fontWeight="700" fill="#4A4F5E" textAnchor={x > 50 ? 'start' : 'end'} fontFamily="Manrope, sans-serif">
            {blocos[i].nome}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function Book3D({ className = '' }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const q = gsap.utils.selector(el)
    const book = q('.bk-book')[0]
    const cover = q('.bk-cover')[0]
    const leaves = q('.bk-leaf')
    // Parts that only exist once the book is open: the left pages, the crease and the spine.
    const leftBlock = q('.bk-block-left, .bk-crease, .bk-spine')
    // The leather spine on the hinge side: it closes the gap between the boards while the book is shut.
    const spineSide = q('.bk-spine-side')
    const light = q('.bk-light')
    const rays = q('.bk-ray')
    const reduced = reducedMotion()
    // Depth (z, px toward the viewer). GSAP applies z before the rotation, so each layer's depth is
    // set for where it lies: closed, the cover is on top and the leaves under it; open, the cover is
    // the board under the left pages and the last leaf turned is on top.
    const t = parseFloat(getComputedStyle(el).getPropertyValue('--t')) || 16
    const closedLeaf = (i: number) => -1 - 0.5 * i
    const openLeaf = (i: number) => -2 + 0.5 * i
    // Open: lying back, seen from above. Closed: turned toward the viewer so the cover reads.
    // Closed, the book only fills the right half of its box (the spine is in the middle), so it
    // slides half a page to the left to stay centered where the open book was.
    const w = parseFloat(getComputedStyle(el).getPropertyValue('--w')) || 200
    const POSE_OPEN = { rotateX: 50, rotateZ: -14, x: 0 }
    const POSE_CLOSED = { rotateX: 22, rotateZ: -5, x: -w / 2 }
    let pose = POSE_OPEN
    let isOpen = false
    let tl: gsap.core.Timeline | null = null

    gsap.set(cover, { z: 1, rotateY: 0 })
    leaves.forEach((l, i) => gsap.set(l, { z: closedLeaf(i), rotateY: 0 }))
    gsap.set(leftBlock, { opacity: 0 })
    gsap.set(spineSide, { opacity: 1 })
    gsap.set(light, { opacity: 0, scale: 0.6 })

    function open(delay = 0) {
      tl?.kill()
      gsap.killTweensOf(book) // a leftover mouse tilt must not fight the new pose
      isOpen = true
      pose = POSE_OPEN
      el.classList.remove('is-closed')
      el.setAttribute('aria-label', labels.fechar)
      tl = gsap.timeline({ delay })
      tl.to(book, { ...POSE_OPEN, duration: 0.7, ease: 'power2.inOut' }, 0)
        .to(cover, { rotateY: -180, z: -(t + 3), duration: 1.3, ease: 'power2.inOut' }, 0.2)
        // The left pages appear as the cover passes upright.
        // The left pages appear once the cover has landed under them; the hinge spine goes at the
        // end of the turn (before, it closes the gap at the hinge).
        .to(leftBlock, { opacity: 1, duration: 0.15 }, 1.4)
        .to(spineSide, { opacity: 0, duration: 0.15 }, 1.4)
        .to(leaves, { rotateY: -180, z: (i: number) => openLeaf(i), duration: 1.1, ease: 'power2.inOut', stagger: 0.14 }, 0.45)
        .to(light, { opacity: 1, scale: 1, duration: 1.2, ease: 'power2.out' }, 0.8)
        .to(rays, { opacity: (i: number) => 0.35 + (i % 3) * 0.15, duration: 1.2, stagger: 0.05 }, 1.0)
      if (reduced) tl.progress(1)
    }

    function close() {
      tl?.kill()
      gsap.killTweensOf(book)
      isOpen = false
      pose = POSE_CLOSED
      el.setAttribute('aria-label', labels.abrir)
      tl = gsap.timeline()
      tl.to([light, rays], { opacity: 0, duration: 0.5 }, 0)
        // Last leaf back first, then the others, then the cover.
        .to(leaves, { rotateY: 0, z: (i: number) => closedLeaf(i), duration: 0.9, ease: 'power2.inOut', stagger: { each: 0.12, from: 'end' } }, 0)
        .to(cover, { rotateY: 0, z: 1, duration: 1.1, ease: 'power2.inOut' }, 0.3)
        .to(leftBlock, { opacity: 0, duration: 0.12 }, 0.3)
        .to(spineSide, { opacity: 1, duration: 0.12 }, 0.3)
        // The book turns to face the viewer and its cover lights up around the edges.
        .to(book, { ...POSE_CLOSED, duration: 0.8, ease: 'power3.out' }, 1.15)
        .add(() => {
          el.classList.add('is-closed')
          lpSound.play('symbol_unlock')
        }, 1.45)
      if (reduced) tl.progress(1)
    }

    function toggle() {
      lpSound.unlock()
      lpSound.play('card_next')
      if (isOpen) close()
      else open()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggle()
      }
    }
    el.addEventListener('click', toggle)
    el.addEventListener('keydown', onKey)

    let entry: gsap.core.Tween | null = null
    let float: gsap.core.Tween | null = null
    const off = onReady(() => {
      if (reduced) {
        open()
        return
      }
      gsap.set(el, { opacity: 0, y: 30 })
      entry = gsap.to(el, { opacity: 1, y: 0, duration: 0.8, delay: 0.35, ease: 'power3.out' })
      open(0.95)
      // Gentle float.
      float = gsap.to(q('.bk-float'), { y: -10, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2.4 })
    })

    // Tilt toward the mouse, around the current pose.
    const host = el.closest('section') ?? window
    const onMove = (e: Event) => {
      const p = e as PointerEvent
      if (p.pointerType !== 'mouse' || reduced) return
      if (tl?.isActive()) return
      const x = p.clientX / window.innerWidth - 0.5
      const y = p.clientY / window.innerHeight - 0.5
      gsap.to(book, { rotateZ: pose.rotateZ + x * 8, rotateX: pose.rotateX - y * 10, duration: 0.8, ease: 'power2.out', overwrite: 'auto' })
    }
    host.addEventListener('pointermove', onMove)

    return () => {
      off()
      tl?.kill()
      entry?.kill()
      float?.kill()
      el.removeEventListener('click', toggle)
      el.removeEventListener('keydown', onKey)
      host.removeEventListener('pointermove', onMove)
      gsap.set([el, book, cover, ...leaves, ...leftBlock, ...light, ...rays, ...q('.bk-float')], { clearProps: 'all' })
    }
  }, [])

  return (
    <div ref={root} role="button" tabIndex={0} aria-label={labels.abrir} className={`bk ${className}`}>
      <div className="bk-float">
        {/* Light rising from the open pages. */}
        <div className="bk-light" />
        <div className="bk-rays">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="bk-ray" style={{ transform: `rotate(${-36 + i * 12}deg)` }} />
          ))}
        </div>

        <div className="bk-book">
          {/* Hardcover back (right) and the rounded spine along the bottom edge. */}
          <div className="bk-back" />
          <div className="bk-spine-side" />
          <div className="bk-spine" />

          {/* Page blocks: the right one from the start, the left one once the book is open. */}
          <div className="bk-block bk-block-right">
            <div className="bk-edge-side" />
            <div className="bk-edge-bottom" />
            <div className="bk-page bk-page-right">
              <MapPage />
              <span className="bk-gutter-shade" />
            </div>
          </div>
          <div className="bk-block bk-block-left">
            <div className="bk-edge-side" />
            <div className="bk-edge-bottom" />
            {/* Its own top page, so the block is solid even before the leaves land on it. */}
            <div className="bk-page bk-page-left">
              <span className="bk-gutter-shade bk-gutter-left" />
            </div>
          </div>

          {/* Leaves that turn over (front: plain page, back: left page). */}
          {[0, 1, 2].map((i) => (
            <div key={i} className="bk-leaf">
              <div className="bk-face bk-page" />
              <div className="bk-face bk-face-back bk-page">
                {i === 2 && (
                  <div className="absolute inset-0 grid place-items-center px-[14%] text-center">
                    <div>
                      <Logo variant="mark" title={null} className="bk-left-mark mx-auto w-auto" />
                      <p className="bk-left-title mt-[0.8em] font-display font-semibold leading-tight text-ink">Do Éden à Nova Jerusalém</p>
                      <p className="bk-left-sub mt-[0.6em] font-bold uppercase tracking-[0.18em] text-gold-ink">66 livros · uma história</p>
                    </div>
                  </div>
                )}
                <span className="bk-gutter-shade bk-gutter-left" />
              </div>
            </div>
          ))}

          {/* The valley where the pages dip into the spine. */}
          <div className="bk-crease" />

          {/* Front cover: leather, gold logo; inside, the endpaper. */}
          <div className="bk-cover">
            <div className="bk-face bk-cover-out">
              <span className="bk-cover-ring" />
              {TWINKLES.map((p, i) => (
                <span key={i} className="bk-twinkle" style={{ left: p[0], top: p[1], animationDelay: `${i * 0.37}s` }} />
              ))}
              <div className="bk-cover-frame">
                <Logo variant="full" title={null} className="w-[70%] text-[#E8D6A6]" />
              </div>
            </div>
            <div className="bk-face bk-face-back bk-cover-in" />
          </div>
        </div>
      </div>
    </div>
  )
}
