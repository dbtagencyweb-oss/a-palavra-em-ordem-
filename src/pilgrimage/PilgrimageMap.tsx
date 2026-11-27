import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { imageSmallPath } from '../media/paths'
import { eraOf } from '../ui/eras'
import { JourneyMedal } from '../ui/JourneyMedal'
import { BackIcon, CheckIcon, CloseIcon, LockIcon, PlayIcon } from '../ui/icons'
import { OilLamp3D } from '../ui/OilLamp3D'
import { Sheet } from '../ui/Sheet'
import { imageForWidth, MapImage, prepareImage, saveMapData } from './MapImage'
import { MapViewport, type MapControls, type MapFrame } from './MapViewport'
import { maps, territories, world, type Camera, type Point, type Territory } from './territories'

export type TerritoryStatus = 'done' | 'open' | 'tomorrow' | 'locked'

type View = { kind: 'world' | 'region' | 'locality'; frame: MapFrame }
type Hotspot = Territory['hotspots'][number]
type Props = {
  current: number
  status: TerritoryStatus[]
  onLesson(day: number): void
  onMore?(): void
}

const worldFrame = (camera: Camera): MapFrame => ({ id: 'mundo', asset: world, initial: camera })
const centerTerritory = (day: number): Camera => ({ point: territories[day - 1].entrance, zoom: day === 1 ? 1.5 : 1.12 })
const statusLabel = { done: 'Concluído', open: 'Disponível', tomorrow: 'Libera amanhã', locked: 'Bloqueado' }
const lessonLabel = { done: 'Revisar o dia', open: 'Abrir a lição', tomorrow: 'Libera amanhã', locked: 'Siga a trilha em ordem' }
const pause = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

function regionFrame(territory: Territory): MapFrame {
  if (territory.asset) return { id: territory.id, asset: territory.asset, initial: territory.regionalCamera }
  return {
    id: territory.id,
    asset: world,
    area: territory.area,
    initial: { point: territory.focal, zoom: 2.25 },
    minZoom: 2.1,
  }
}

export function PilgrimageMap({ current, status, onLesson, onMore }: Props) {
  const reduce = useReducedMotion()
  const [atmosphere, setAtmosphere] = useState(true)
  const [selected, setSelected] = useState(current)
  const [view, setView] = useState<View>(() => ({ kind: 'world', frame: worldFrame(centerTerritory(current)) }))
  const [incoming, setIncoming] = useState<MapFrame | null>(null)
  const [moving, setMoving] = useState(false)
  const [scene, setScene] = useState<{ hotspot: Hotspot; day: number } | null>(null)
  const [notice, setNotice] = useState('')
  const [folded, setFolded] = useState(false)
  const controls = useRef<MapControls>(null)
  const mapRoot = useRef<HTMLElement>(null)
  const worldReturn = useRef<Camera>(centerTerritory(current))
  const regionReturn = useRef<MapFrame | null>(null)
  const changing = useRef(false)
  const mounted = useRef(false)
  const finishFade = useRef<(() => void) | null>(null)
  const lastCurrent = useRef(current)
  const region = territories[selected - 1]
  const state = status[selected - 1]
  const canOpen = state === 'done' || state === 'open'
  const reduced = !!reduce || !atmosphere

  useLayoutEffect(() => {
    const root = mapRoot.current
    if (!root || view.kind !== 'world' || incoming) return

    let active = true
    const fit = () => { if (active) fitDayLabels(root) }
    const observer = new ResizeObserver(fit)
    observer.observe(root)
    fit()
    void document.fonts.ready.then(fit)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [view.kind, incoming])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      finishFade.current?.()
    }
  }, [])

  useEffect(() => {
    if (lastCurrent.current === current) return
    if (view.kind === 'world' && selected === lastCurrent.current) {
      setSelected(current)
      void controls.current?.fly(centerTerritory(current), reduced ? 0 : 440)
    }
    lastCurrent.current = current
  }, [current, reduced, selected, view.kind])

  useEffect(() => {
    const active = territories[current - 1].asset
    const next = territories[current]?.asset
    const currentFrame = controls.current
    if (!active || !currentFrame) return
    let stop = false
    const timer = window.setTimeout(async () => {
      await prepareImage(active.preview.path)
      if (!stop && next && !saveMapData()) void prepareImage(next.preview.path)
    }, 280)
    return () => { stop = true; window.clearTimeout(timer) }
  }, [current])

  async function transfer(next: View, approach: Camera) {
    const map = controls.current
    if (!map || changing.current) return
    changing.current = true
    setMoving(true)
    setNotice('')
    try {
      const before = map.camera()
      const width = map.width(next.frame)
      if (next.frame.asset !== view.frame.asset) {
        const request = Promise.any([imageForWidth(next.frame.asset, width).path, next.frame.asset.preview.path].map(async (url) => {
          if (!await prepareImage(url)) throw new Error('Arte indisponível')
          return true
        })).catch(() => false)
        const [, ready] = await Promise.all([map.fly(approach, reduced ? 0 : 500), Promise.race([request, pause(1600).then(() => false)])])
        if (!ready) {
          if (!mounted.current) return
          setNotice('Não foi possível carregar o mapa. Tente outra vez.')
          await map.fly(before, reduced ? 0 : 260)
          return
        }
      } else {
        await map.fly(approach, reduced ? 0 : 500)
      }
      if (!mounted.current) return
      if (!reduced) {
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(complete, 1500)
          function complete() {
            window.clearTimeout(timeout)
            finishFade.current = null
            resolve()
          }
          finishFade.current = complete
          setIncoming(next.frame)
        })
      }
      if (!mounted.current) return
      setView(next)
      setIncoming(null)
      map.focus()
    } finally {
      changing.current = false
      if (mounted.current) setMoving(false)
    }
  }

  function explore() {
    if (!canOpen || view.kind !== 'world' || changing.current) return
    worldReturn.current = controls.current?.camera() ?? centerTerritory(current)
    const frame = regionFrame(region)
    const zoom = Math.max(1.65, frame.minZoom ?? 1, worldReturn.current.zoom * 1.16)
    void transfer({ kind: 'region', frame }, { point: region.focal, zoom })
  }

  function back() {
    if (changing.current || view.kind === 'world') return
    const map = controls.current
    const pose = map?.camera() ?? view.frame.initial
    if (view.kind === 'locality' && regionReturn.current) {
      void transfer({ kind: 'region', frame: regionReturn.current }, { ...pose, zoom: Math.max(view.frame.minZoom ?? 1, pose.zoom / 1.25) })
      return
    }
    const frame = worldFrame(worldReturn.current)
    void transfer({ kind: 'world', frame }, { ...pose, zoom: Math.max(view.frame.minZoom ?? 1, pose.zoom / 1.25) })
  }

  function openHotspot(hotspot: Hotspot, day: number) {
    const access = status[day - 1]
    if ((access !== 'done' && access !== 'open') || changing.current) return
    const asset = hotspot.locality && maps[hotspot.locality.asset]
    if (view.kind === 'region' && hotspot.locality && asset) {
      regionReturn.current = { ...view.frame, initial: controls.current?.camera() ?? view.frame.initial }
      void transfer({
        kind: 'locality',
        frame: { id: hotspot.id, asset, initial: hotspot.locality.camera },
      }, { point: hotspot.point, zoom: 1.7 })
    } else if (hotspot.scene && maps[hotspot.scene]) {
      setScene({ hotspot, day })
    }
  }

  function centerOn(day: number) {
    if (view.kind !== 'world' || changing.current) return
    setSelected(day)
    const camera = centerTerritory(day)
    void controls.current?.fly(camera, reduced ? 0 : 440)
  }

  function locateDiscovery(point: Point) {
    const map = controls.current
    if (!map || changing.current) return
    void map.fly({ point, zoom: map.camera().zoom }, reduced ? 0 : 360)
  }

  const sceneContent = scene?.hotspot
  const art = sceneContent?.scene ? maps[sceneContent.scene] : undefined
  const discoveryTerritories = view.kind === 'world' ? territories : view.kind === 'region' ? [region] : []
  const discoveries = discoveryTerritories.flatMap((item) => {
    const access = status[item.n - 1]
    if (access !== 'done' && access !== 'open') return []
    return item.hotspots
      .filter((spot) => view.kind === 'region' || (spot.scene && maps[spot.scene]))
      .map((spot) => (
        <DiscoveryPin
          key={spot.id}
          spot={spot}
          point={view.kind === 'world' ? spot.worldPoint : spot.point}
          busy={moving}
          onLocate={locateDiscovery}
          onOpen={() => openHotspot(spot, item.n)}
        />
      ))
  })

  return (
    <section ref={mapRoot} className="pilgrimage" aria-label="Peregrinação pela Bíblia" data-testid="pilgrimage-map" data-level={view.kind} data-effects={atmosphere}>
      <MapViewport
        ref={controls}
        frame={view.frame}
        incoming={incoming}
        busy={moving}
        reduced={reduced}
        onIncomingShown={() => finishFade.current?.()}
        discoveries={discoveries}
      >
        {view.kind === 'world' && (
          <>
            <PilgrimageTrail status={status} current={current} reduced={reduced} />
            <motion.div
              className="pilgrimage-lamp-anchor"
              initial={false}
              animate={position(territories[current - 1].entrance)}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 65, damping: 16 }}
              aria-hidden="true"
            >
              <span className="pilgrimage-lamp"><OilLamp3D className="w-full drop-shadow-[0_4px_5px_rgba(30,20,12,0.42)]" /></span>
            </motion.div>
            {territories.map((item, index) => {
              const era = eraOf(item.n)
              const pinStyle = {
                ...position(item.entrance),
                '--pin-tone': era.mid,
                '--pin-deep': era.deep,
                '--pin-light': era.light,
                '--pin-delay': `${-index * 0.57}s`,
              } as CSSProperties
              return (
                <div key={item.id} className="pilgrimage-pin-anchor" style={pinStyle}>
                  <button
                    type="button"
                    className="pilgrimage-pin"
                    data-state={status[index]}
                    data-current={item.n === current}
                    data-territory={item.id}
                    aria-label={`Dia ${item.n} · ${item.place} · ${item.lesson.titulo} · ${statusLabel[status[index]]}`}
                    aria-pressed={selected === item.n}
                    disabled={moving}
                    onClick={() => {
                      setSelected(item.n)
                      setFolded(false)
                    }}
                    onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) centerOn(item.n) }}
                  >
                    <span className="pilgrimage-medallion"><JourneyMedal id={item.lesson.simbolo.midia} n={item.n} /></span>
                    <span className="pilgrimage-pin-status" aria-hidden="true">
                      {status[index] === 'done' ? <CheckIcon size={12} /> : status[index] === 'locked' || status[index] === 'tomorrow' ? <LockIcon size={11} /> : item.n}
                    </span>
                  </button>
                  <span
                    className="pilgrimage-pin-label"
                    data-side={item.entrance[0] < 0.5 ? 'right' : 'left'}
                    data-current={item.n === current}
                    aria-hidden="true"
                  >
                    <small>Dia {item.n} · {item.place}</small>
                    <strong className="font-display">{item.lesson.titulo}</strong>
                  </span>
                </div>
              )
            })}
          </>
        )}
      </MapViewport>

      <div className="pilgrimage-haze" aria-hidden="true" />

      <div className="pilgrimage-top">
        {view.kind === 'world' ? (
          <>
            <div className="pilgrimage-map-label"><span aria-hidden="true">✦</span> Mapa da jornada</div>
            {!folded && (
              <button type="button" className="pilgrimage-explore" onClick={explore} disabled={!canOpen || moving}>Explorar região <span aria-hidden="true">›</span></button>
            )}
          </>
        ) : (
          <button type="button" className="pilgrimage-back" onClick={back} disabled={moving}>
            <BackIcon size={16} /> {view.kind === 'locality' ? 'Voltar à região' : 'Voltar ao mapa'}
          </button>
        )}
        <button
          type="button"
          className="pilgrimage-tool"
          aria-label={atmosphere ? 'Desativar efeitos do mapa' : 'Ativar efeitos do mapa'}
          aria-pressed={atmosphere}
          onClick={() => setAtmosphere((value) => !value)}
          title={atmosphere ? 'Desativar efeitos' : 'Ativar efeitos'}
        ><span aria-hidden="true">{atmosphere ? '✦' : '✧'}</span></button>
      </div>
      {onMore && (
        <button type="button" className="pilgrimage-more" onClick={onMore}>Mais da jornada <span aria-hidden="true">↓</span></button>
      )}

      <div className="pilgrimage-overlays">
        <div className="pilgrimage-tools">
          {view.kind === 'world' && (
            <button type="button" className="pilgrimage-tool" aria-label="Centralizar na minha posição" onClick={() => centerOn(current)} disabled={moving}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <circle cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="2" /><path d="M12 1v4m0 14v4M1 12h4m14 0h4" />
              </svg>
            </button>
          )}
          <button type="button" className="pilgrimage-tool" aria-label="Aproximar mapa" disabled={moving} onClick={() => controls.current?.zoom(1.26)}>+</button>
          <button type="button" className="pilgrimage-tool" aria-label="Afastar mapa" disabled={moving} onClick={() => controls.current?.zoom(1 / 1.26)}>−</button>
        </div>

        {notice && <p className="pilgrimage-notice" role="status">{notice}</p>}

        <button type="button" className="pilgrimage-tool pilgrimage-fold" aria-expanded={!folded} aria-label={folded ? 'Expandir detalhes do território' : 'Recolher detalhes do território'} onClick={() => setFolded((value) => !value)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={folded ? 'M5 15l7-7 7 7' : 'm5 9 7 7 7-7'} /></svg>
        </button>
        <div className="pilgrimage-hud continue-glow is-floating" data-folded={folded}>
          <div className="pilgrimage-hud-head">
            {!folded && (
              <span className="pilgrimage-hud-thumb" style={{ backgroundColor: eraOf(region.n).deep }} aria-hidden="true">
                <img key={region.n} src={imageSmallPath(`era-d${region.n}`)} alt="" decoding="async" onError={(event) => { event.currentTarget.hidden = true }} />
              </span>
            )}
            <div className="pilgrimage-hud-copy" aria-live="polite">
              <p>Dia {region.n} de 7 <span>·</span> {statusLabel[state]}</p>
              <h3>{folded ? region.place : region.lesson.titulo}</h3>
              {!folded && (
                <p className="pilgrimage-hud-place">
                  {region.place}
                  {view.kind !== 'world' && region.reference !== region.place && <span> · {region.reference}</span>}
                </p>
              )}
            </div>
            <button
              type="button"
              className={`pilgrimage-play ${canOpen ? 'play-shine' : ''}`}
              aria-label={lessonLabel[state]}
              title={lessonLabel[state]}
              onClick={() => onLesson(region.n)}
              disabled={!canOpen || moving}
            >
              {canOpen ? <PlayIcon size={17} /> : <LockIcon size={17} />}
            </button>
          </div>
        </div>
      </div>

      <Sheet
        open={!!scene && !!art}
        onClose={() => setScene(null)}
        labelledBy="pilgrimage-scene-title"
        tone="dark"
        centered
        className="pilgrimage-scene-panel"
        backdropClassName="pilgrimage-scene-backdrop"
      >
        {scene && sceneContent && art && (
          <>
            <div className="pilgrimage-scene-header">
              <div>
                <p>{sceneContent.reference}</p>
                <h3 id="pilgrimage-scene-title" className="font-display">{sceneContent.title}</h3>
              </div>
              <button type="button" onClick={() => setScene(null)} aria-label="Fechar cena" className="pilgrimage-scene-close"><CloseIcon size={18} /></button>
            </div>
            <div className="pilgrimage-scene-frame">
              <div className="pilgrimage-scene" style={{ '--scene-ratio': art.width / art.height } as CSSProperties}>
                <MapImage key={art.preview.path} asset={art} width={420} alt={sceneContent.title} />
              </div>
            </div>
            <div className="pilgrimage-scene-caption">
              <p>{sceneContent.description}</p>
              {sceneContent.lessonLabel && (
                <button type="button" onClick={() => { setScene(null); onLesson(scene.day) }}>{sceneContent.lessonLabel} <span aria-hidden="true">›</span></button>
              )}
            </div>
          </>
        )}
      </Sheet>
    </section>
  )
}

function DiscoveryPin({ spot, point, busy, onLocate, onOpen }: {
  spot: Hotspot
  point: Point
  busy: boolean
  onLocate(point: Point): void
  onOpen(): void
}) {
  const art = (spot.scene && maps[spot.scene]) || (spot.locality && maps[spot.locality.asset])
  if (!art) return null

  return (
    <div className="pilgrimage-pin-anchor pilgrimage-discovery-anchor" style={position(point)}>
      <button
        type="button"
        className="pilgrimage-hotspot"
        disabled={busy}
        aria-label={spot.title}
        onClick={onOpen}
        onFocus={(event) => {
          const button = event.currentTarget
          const viewport = button.closest('.pilgrimage-viewport')?.getBoundingClientRect()
          if (!viewport || !button.matches(':focus-visible')) return
          const pin = button.getBoundingClientRect()
          if (pin.top < viewport.top || pin.bottom > viewport.bottom ||
              pin.left < viewport.left || pin.right > viewport.right) onLocate(point)
        }}
      >
        <span className="pilgrimage-hotspot-thumb">
          <img src={art.preview.path} alt="" loading="lazy" decoding="async" width={art.preview.width} height={art.preview.height} />
        </span>
        <span className="pilgrimage-hotspot-label">
          <strong>{spot.title}</strong>
          <small>{spot.reference}</small>
        </span>
      </button>
    </div>
  )
}

function position([left, top]: Point) {
  return { left: `${left * 100}%`, top: `${top * 100}%` }
}

function fitDayLabels(root: HTMLElement) {
  const labels = [...root.querySelectorAll<HTMLElement>('.pilgrimage-pin-label')]
  const range = document.createRange()
  for (const label of labels) label.style.removeProperty('--pin-label-fit')

  const fits = labels.map((label) => {
    const style = getComputedStyle(label)
    const scale = label.getBoundingClientRect().width / label.offsetWidth || 1
    let widest = 0
    for (const line of label.children) {
      range.selectNodeContents(line)
      for (const rect of range.getClientRects()) widest = Math.max(widest, rect.width)
    }
    const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
    const border = label.offsetWidth - label.clientWidth
    return { label, width: Math.ceil(widest / scale + padding + border + 1), height: label.offsetHeight }
  })

  for (const { label, width } of fits) label.style.setProperty('--pin-label-fit', `${width}px`)
  for (const { label, height } of fits) {
    if (label.offsetHeight > height) label.style.removeProperty('--pin-label-fit')
  }
}

function PilgrimageTrail({ status, current, reduced }: { status: TerritoryStatus[]; current: number; reduced: boolean }) {
  return (
    <svg className="pilgrimage-trail" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
      {territories.slice(1).map((item, index) => {
        const walked = status[index] === 'done' && (item.n !== 4 || status[3] === 'done')
        return (
          <g key={item.id}>
            <path d={item.trailFromPrevious} className="pilgrimage-trail-future" vectorEffect="non-scaling-stroke" data-current={item.n === current} />
            {walked && (
              <motion.path
                className="pilgrimage-trail-done"
                d={item.trailFromPrevious}
                vectorEffect="non-scaling-stroke"
                initial={reduced || item.n !== current ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduced ? 0 : 0.85 }}
              />
            )}
            {item.crossing && status[3] === 'done' && (
              <path d={item.crossing} data-testid="pilgrimage-red-sea-crossing" className="pilgrimage-trail-crossing" vectorEffect="non-scaling-stroke" />
            )}
          </g>
        )
      })}
    </svg>
  )
}
