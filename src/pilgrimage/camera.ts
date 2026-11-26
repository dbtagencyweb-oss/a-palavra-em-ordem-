import type { Area, Camera, Point } from './territories'

export type Size = { width: number; height: number }
export type CameraSpace = { viewport: Size; ratio: number; minZoom: number; maxZoom: number; area?: Area }

const limit = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))

export function mapSize(viewport: Size, ratio: number): Size {
  const width = Math.max(viewport.width, viewport.height * ratio)
  return { width, height: width / ratio }
}

export function frameCamera(space: CameraSpace, camera: Camera) {
  const base = mapSize(space.viewport, space.ratio)
  const zoom = limit(camera.zoom, space.minZoom, space.maxZoom)
  const { width, height } = space.viewport
  const halfX = width / (2 * base.width * zoom)
  const halfY = height / (2 * base.height * zoom)
  const [left, top, right, bottom] = space.area ?? [0, 0, 1, 1]
  const clampAxis = (value: number, half: number, min: number, max: number) =>
    limit(limit(value, min, max), half, 1 - half)
  const point: Point = [
    clampAxis(camera.point[0], halfX, left, right),
    clampAxis(camera.point[1], halfY, top, bottom),
  ]
  return {
    camera: { point, zoom },
    ...base,
    x: width / 2 - point[0] * base.width * zoom,
    y: height / 2 - point[1] * base.height * zoom,
  }
}

export function moveCamera(space: CameraSpace, camera: Camera, dx: number, dy: number): Camera {
  const base = mapSize(space.viewport, space.ratio)
  return frameCamera(space, {
    ...camera,
    point: [camera.point[0] - dx / (base.width * camera.zoom), camera.point[1] - dy / (base.height * camera.zoom)],
  }).camera
}

export function mapPoint(space: CameraSpace, camera: Camera, pixel: Point): Point {
  const frame = frameCamera(space, camera)
  return [(pixel[0] - frame.x) / (frame.width * frame.camera.zoom), (pixel[1] - frame.y) / (frame.height * frame.camera.zoom)]
}

export function zoomCamera(space: CameraSpace, camera: Camera, zoom: number, from: Point, to = from): Camera {
  const point = mapPoint(space, camera, from)
  const target = limit(zoom, space.minZoom, space.maxZoom)
  const { width, height } = mapSize(space.viewport, space.ratio)
  return frameCamera(space, {
    zoom: target,
    point: [
      point[0] - (to[0] - space.viewport.width / 2) / (width * target),
      point[1] - (to[1] - space.viewport.height / 2) / (height * target),
    ],
  }).camera
}
