import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { frameCamera, moveCamera, zoomCamera, type CameraSpace, type Size } from './camera'
import { MapImage } from './MapImage'
import type { Area, Camera, MapAsset, Point } from './territories'

export type MapFrame = { id: string; asset: MapAsset; initial: Camera; area?: Area; minZoom?: number }
export type MapControls = {
  camera(): Camera
  width(frame: MapFrame): number
  fly(camera: Camera, duration?: number): Promise<void>
  zoom(multiplier: number): void
  focus(): void
}

const MAX_ZOOM = 3.6
const MAP_CROSSFADE_MS = 360

function spaceFor(frame: MapFrame, viewport: Size): CameraSpace {
  return { viewport, ratio: frame.asset.width / frame.asset.height, minZoom: frame.minZoom ?? 1, maxZoom: MAX_ZOOM, area: frame.area }
}

function stageStyle(space: CameraSpace, camera: Camera): CSSProperties {
  const poses = frameCamera(space, camera)
  return {
    transform: `translate3d(${poses.x}px, ${poses.y}px, 0) scale(${poses.camera.zoom})`,
    width: poses.width,
    height: poses.height,
    '--map-pin-inverse': 1 / poses.camera.zoom,
  } as CSSProperties
}

type Props = {
  frame: MapFrame
  incoming: MapFrame | null
  busy: boolean
  reduced: boolean
  onIncomingShown(): void
  discoveries: ReactNode
  children: ReactNode
}

const center = (size: Size): Point => [size.width / 2, size.height / 2]
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
const middle = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

export const MapViewport = forwardRef<MapControls, Props>(function MapViewport({ frame, incoming, busy, reduced, onIncomingShown, discoveries, children }, ref) {
  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const discoveryLayer = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size>({ width: 1, height: 1 })
  const pose = useRef(frame.initial)
  const request = useRef(0)
  const stopFlight = useRef<(() => void) | null>(null)
  const pointerFrame = useRef(0)
  const pointers = useRef(new Map<number, Point>())
  const space = spaceFor(frame, size)
  const state = useRef({ space, busy })
  state.current = { space, busy }

  function draw(camera: Camera) {
    const actual = frameCamera(state.current.space, camera)
    pose.current = actual.camera
    const el = stage.current
    if (!el) return
    el.style.transform = `translate3d(${actual.x}px,${actual.y}px,0) scale(${actual.camera.zoom})`
    const inverse = String(1 / actual.camera.zoom)
    if (el.style.getPropertyValue('--map-pin-inverse') !== inverse) el.style.setProperty('--map-pin-inverse', inverse)
    const overlay = discoveryLayer.current
    if (!overlay) return
    overlay.style.transform = `translate3d(${actual.x}px,${actual.y}px,0)`
    overlay.style.width = `${actual.width * actual.camera.zoom}px`
    overlay.style.height = `${actual.height * actual.camera.zoom}px`
  }

  function paintNextFrame(camera: Camera) {
    pose.current = camera
    if (!pointerFrame.current) {
      pointerFrame.current = requestAnimationFrame(() => {
        pointerFrame.current = 0
        draw(pose.current)
      })
    }
  }

  function fly(camera: Camera, duration = 0) {
    stopFlight.current?.()
    cancelAnimationFrame(pointerFrame.current)
    pointerFrame.current = 0
    const from = pose.current
    const destination = frameCamera(state.current.space, camera).camera
    if (!duration) {
      draw(destination)
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      const started = performance.now()
      const done = () => {
        cancelAnimationFrame(request.current)
        stopFlight.current = null
        resolve()
      }
      stopFlight.current = done
      const tick = (now: number) => {
        const fraction = Math.min(1, (now - started) / duration)
        const t = 0.5 - Math.cos(fraction * Math.PI) / 2
        draw({
          point: [
            from.point[0] + (destination.point[0] - from.point[0]) * t,
            from.point[1] + (destination.point[1] - from.point[1]) * t,
          ],
          zoom: from.zoom + (destination.zoom - from.zoom) * t,
        })
        if (fraction < 1) request.current = requestAnimationFrame(tick)
        else done()
      }
      request.current = requestAnimationFrame(tick)
    })
  }

  function zoom(multiplier: number) {
    if (state.current.busy) return
    const current = state.current.space
    void fly(zoomCamera(current, pose.current, pose.current.zoom * multiplier, center(current.viewport)), reduced ? 0 : 160)
  }

  useImperativeHandle(ref, () => ({
    camera: () => pose.current,
    width: (next) => frameCamera(spaceFor(next, state.current.space.viewport), next.initial).width,
    fly,
    zoom,
    focus: () => root.current?.focus({ preventScroll: true }),
  }))

  useLayoutEffect(() => {
    if (!root.current) return
    const el = root.current
    const resize = () => setSize({ width: Math.max(1, el.clientWidth), height: Math.max(1, el.clientHeight) })
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    resize()
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => { draw(frame.initial) }, [frame])
  useLayoutEffect(() => { draw(pose.current) }, [size])
  useEffect(() => () => {
    stopFlight.current?.()
    cancelAnimationFrame(pointerFrame.current)
  }, [])

  useEffect(() => {
    const el = root.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      if (state.current.busy || !event.cancelable) return
      const current = state.current.space
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? current.viewport.height : 1
      const old = pose.current
      const zooming = event.ctrlKey || event.metaKey
      let next: Camera
      if (zooming) {
        const rect = el.getBoundingClientRect()
        const point: Point = [event.clientX - rect.left, event.clientY - rect.top]
        next = zoomCamera(current, old, old.zoom * Math.exp(-event.deltaY * unit * 0.004), point)
      } else {
        next = moveCamera(current, old, -event.deltaX * unit, -event.deltaY * unit)
      }
      const moved = old.zoom !== next.zoom || distance(old.point, next.point) > 0.00001
      if (!moved && !zooming) return
      event.preventDefault()
      stopFlight.current?.()
      paintNextFrame(next)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function relative(event: PointerEvent): Point {
    const rect = event.currentTarget.getBoundingClientRect()
    return [event.clientX - rect.left, event.clientY - rect.top]
  }

  function start(event: PointerEvent<HTMLDivElement>) {
    if (busy || event.button !== 0 || (event.target instanceof Element && event.target.closest('button'))) return
    if (pointers.current.size >= 2) return
    stopFlight.current?.()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, relative(event))
    event.currentTarget.dataset.dragging = 'true'
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId)
    if (!previous || busy) return
    const next = relative(event)
    pointers.current.set(event.pointerId, next)
    const other = [...pointers.current].find(([id]) => id !== event.pointerId)?.[1]
    const old = pose.current
    const camera = other
      ? zoomCamera(space, old, old.zoom * distance(next, other) / Math.max(1, distance(previous, other)), middle(previous, other), middle(next, other))
      : moveCamera(space, old, next[0] - previous[0], next[1] - previous[1])
    paintNextFrame(camera)
  }

  function stop(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size === 0) delete event.currentTarget.dataset.dragging
  }

  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (busy || event.target !== event.currentTarget) return
    const step = 64
    const delta: Record<string, Point> = { ArrowUp: [0, step], ArrowDown: [0, -step], ArrowLeft: [step, 0], ArrowRight: [-step, 0] }
    if (event.key in delta) {
      event.preventDefault()
      void fly(moveCamera(space, pose.current, ...delta[event.key]))
    }
    if (event.key === '+' || event.key === '=' || event.key === '-') {
      event.preventDefault()
      zoom(event.key === '-' ? 1 / 1.3 : 1.3)
    }
  }

  const { width, height } = frameCamera(space, frame.initial)
  const incomingSpace = incoming ? spaceFor(incoming, size) : null

  return (
    <div
      ref={root}
      role="region"
      aria-label="Mapa interativo. Use as setas para mover e mais ou menos para aproximar."
      tabIndex={0}
      className="pilgrimage-viewport"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={key}
    >
      <div ref={stage} className="pilgrimage-stage" style={{ width, height }}>
        {size.width > 1 && <MapImage key={frame.asset.preview.path} asset={frame.asset} width={width} />}
        {!incoming && children}
      </div>
      <div ref={discoveryLayer} className="pilgrimage-discoveries">
        {!incoming && discoveries}
      </div>
      {incoming && incomingSpace && (
        <div
          className="pilgrimage-incoming"
          aria-hidden="true"
          style={{ animationDuration: `${reduced ? 0 : MAP_CROSSFADE_MS}ms` }}
          onAnimationEnd={(event) => { if (event.target === event.currentTarget) onIncomingShown() }}
        >
          <div className="pilgrimage-stage" style={stageStyle(incomingSpace, incoming.initial)}>
            <MapImage asset={incoming.asset} width={frameCamera(incomingSpace, incoming.initial).width} />
          </div>
        </div>
      )}
    </div>
  )
})
