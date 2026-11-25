import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { ColladaLoader, type Collada } from 'three/examples/jsm/loaders/ColladaLoader.js'

const MODEL = '/media/ui/two-hands.dae'
let modelPromise: Promise<Collada> | undefined

function loadModel() {
  modelPromise ??= new Promise<Collada>((resolve, reject) => {
    new ColladaLoader().load(MODEL, (data) => (data ? resolve(data) : reject(new Error('Collada vazio.'))), undefined, reject)
  })
  return modelPromise
}

/** Begin downloading and parsing the model on the reflection card before the prayer. */
export function preloadPrayerHandsModel() {
  void loadModel()
}

function cloneHand(source: THREE.Object3D, height: number) {
  const model = source.clone(true)
  const skin = new THREE.MeshPhysicalMaterial({
    color: 0xd9a174,
    roughness: 0.72,
    metalness: 0,
    clearcoat: 0.05,
    clearcoatRoughness: 0.82,
    sheen: 0.15,
    sheenColor: new THREE.Color(0xffe4ce),
  })

  model.traverse((object) => {
    if (object instanceof THREE.Line || object instanceof THREE.LineSegments) object.visible = false
    if (!(object instanceof THREE.Mesh)) return
    object.material = skin
  })

  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  model.position.sub(center)

  const normalized = new THREE.Group()
  normalized.add(model)
  normalized.scale.setScalar(height / Math.max(size.x, size.y, size.z, 0.001))
  normalized.rotation.z = Math.PI
  const root = new THREE.Group()
  root.add(normalized)
  return root
}

function findHand(scene: THREE.Object3D) {
  return scene.getObjectByName('SketchUp_Instance_1') ?? scene.getObjectByName('obj0')
}

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    geometries.add(object.geometry)
    const list = Array.isArray(object.material) ? object.material : [object.material]
    list.forEach((material) => materials.add(material))
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
}

export function PrayerHands3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
    } catch {
      setFallback(true)
      return
    }

    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(29, 1, 0.1, 30)
    camera.position.set(0, 0.04, 6.2)
    camera.lookAt(0, 0.04, 0)

    scene.add(new THREE.HemisphereLight(0xfff1e6, 0xa78671, 2.3))
    const key = new THREE.DirectionalLight(0xfff5ed, 2.4)
    key.position.set(0, 3, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xffd0a5, 0.8)
    rim.position.set(0, 2, -4)
    scene.add(rim)

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let left: THREE.Group | undefined
    let right: THREE.Group | undefined
    let frame = 0
    let disposed = false
    let startedAt = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.round(rect.width))
      const height = Math.max(1, Math.round(rect.height))
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
    }

    const placeHands = (progress: number) => {
      if (!left || !right) return
      const smooth = (value: number) => value * value * (3 - 2 * value)
      const separation = smooth(THREE.MathUtils.clamp(progress / 0.84, 0, 1))
      const opening = smooth(THREE.MathUtils.clamp(progress / 0.95, 0, 1))
      const distance = THREE.MathUtils.lerp(0.83, 1.02, separation)
      const yaw = THREE.MathUtils.lerp(1.18, 1.66, opening)
      const tilt = THREE.MathUtils.lerp(0.12, 0.06, opening)
      const pitch = THREE.MathUtils.lerp(-0.08, -0.18, opening)
      const size = THREE.MathUtils.lerp(0.96, 1, separation)

      left.position.set(-distance, -0.02, 0)
      left.rotation.set(pitch, -yaw, -tilt)
      left.scale.set(-size, size, size)

      right.position.set(distance, -0.02, 0)
      right.rotation.set(pitch, yaw, tilt)
      right.scale.setScalar(size)
    }

    const animate = (now: number) => {
      if (disposed) return
      const progress = reducedMotion ? 1 : THREE.MathUtils.clamp((now - startedAt - 700) / 1600, 0, 1)
      placeHands(progress)
      renderer.render(scene, camera)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }

    void loadModel()
      .then((collada) => {
        if (disposed) return
        const hand = findHand(collada.scene)
        if (!hand) throw new Error('A malha da mão não foi encontrada no Collada.')
        // Reflect the same mesh so the two palms respond identically to the centered lights.
        left = cloneHand(hand, 2.16)
        right = cloneHand(hand, 2.16)
        scene.add(left, right)
        placeHands(reducedMotion ? 1 : 0)
        startedAt = performance.now()
        frame = requestAnimationFrame(animate)
      })
      .catch(() => setFallback(true))

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const contextLost = (event: Event) => {
      event.preventDefault()
      setFallback(true)
    }
    canvas.addEventListener('webglcontextlost', contextLost)

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('webglcontextlost', contextLost)
      disposeObject(scene)
      renderer.dispose()
    }
  }, [])

  if (fallback) return <img className="prayer-hands-fallback" src="/media/ui/maos-oracao-3d-v2.webp" alt="" draggable={false} />
  return <canvas ref={canvasRef} className="prayer-hands-canvas" aria-hidden="true" />
}
