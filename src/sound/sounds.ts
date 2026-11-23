// Sound ids from docs/02-design-som-midia.md. Files live in public/audio/sfx/{id}.webm and .mp3.

export const SFX_IDS = [
  'tap',
  'card_next',
  'slot_place',
  'match',
  'correct',
  'wrong',
  'tick',
  'scene_in',
  'lamp_ignite',
  'day_complete',
  'symbol_unlock',
  'grace_used',
  'offer_open',
  'footstep_sand',
] as const
export type SfxId = (typeof SFX_IDS)[number]

export const AMBIENT_IDS = [
  'amb_desert_wind',
  'amb_night_crickets',
  'amb_water_sea',
  'amb_fire_soft',
  'amb_city_morning',
  'amb_temple_reverb',
  'amb_garden_birds',
] as const
export type AmbientId = (typeof AMBIENT_IDS)[number]

export const DEFAULT_VOLUME = 0.6
export const AMBIENT_VOLUME = 0.25
export const AMBIENT_FADE_MS = 500

export function isAmbientId(id: string | undefined): id is AmbientId {
  return !!id && (AMBIENT_IDS as readonly string[]).includes(id)
}

export const soundUrls = (id: string) => [`/audio/sfx/${id}.webm`, `/audio/sfx/${id}.mp3`]
