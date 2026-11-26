import { useState } from 'react'
import type { MapAsset } from './territories'

export function saveMapData() {
  const device = navigator as Navigator & { connection?: { saveData?: boolean } }
  return device.connection?.saveData === true
}

export function imageForWidth(asset: MapAsset, width: number) {
  const pixels = width * Math.min(saveMapData() ? 1 : 2, window.devicePixelRatio || 1)
  return asset.variants.find((item) => item.width >= pixels) ?? asset.variants[asset.variants.length - 1]
}

// Share a pending request without keeping decoded images alive in JavaScript after it finishes.
const pending = new Map<string, Promise<boolean>>()
export function prepareImage(url: string) {
  const existing = pending.get(url)
  if (existing) return existing
  const image = new Image()
  image.src = url
  const result = image.decode().then(() => true, () => false).finally(() => pending.delete(url))
  pending.set(url, result)
  return result
}

export function MapImage({ asset, width, alt = '' }: { asset: MapAsset; width: number; alt?: string }) {
  const source = imageForWidth(asset, width)
  const [loaded, setLoaded] = useState('')
  return (
    <div className="pilgrimage-image">
      {source.path !== asset.preview.path && <img src={asset.preview.path} alt="" aria-hidden="true" decoding="async" />}
      <img
        src={source.path}
        alt={alt}
        decoding="async"
        data-loaded={loaded === source.path || source.path === asset.preview.path}
        onLoad={() => setLoaded(source.path)}
      />
    </div>
  )
}
