// One color world per day of Trilha 1, following the places of the story
// (dia.lugar in the content). Visual only: no text lives here.
//   deep   → dark backgrounds (chapter opener, scenes, conclusion)
//   light  → text and highlights on `deep` (AA ≥ 7:1)
//   mid    → the era's signature color (map trail, done nodes, progress)

export interface Era {
  deep: string
  light: string
  mid: string
}

const ERAS: Record<number, Era> = {
  1: { deep: '#2A2620', light: '#F1E3C4', mid: '#B8893A' }, // Visão do todo: lamp light
  2: { deep: '#253222', light: '#E1E6D2', mid: '#6F8A4A' }, // Éden: garden green
  3: { deep: '#352A1F', light: '#F0DDBE', mid: '#B48A4E' }, // Canaã: sand and tents
  4: { deep: '#3A2418', light: '#F3D6C2', mid: '#B5663A' }, // Sinai: ochre rock
  5: { deep: '#232540', light: '#DCDDF2', mid: '#5E62A0' }, // Jerusalém e Babilônia: exile indigo
  6: { deep: '#1C3140', light: '#D3E6EE', mid: '#3F7891' }, // Galileia: lake blue
  7: { deep: '#33291A', light: '#F6E7C1', mid: '#A8832E' }, // Nova Jerusalém: gold
}

export function eraOf(day: number): Era {
  return ERAS[day] ?? ERAS[1]
}
