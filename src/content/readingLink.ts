import { livros } from './index'

// USFM book codes (used by bible.com) keyed by the ids in content/livros.json.
const USFM: Record<string, string> = {
  gn: 'GEN', ex: 'EXO', lv: 'LEV', nm: 'NUM', dt: 'DEU', js: 'JOS', jz: 'JDG', rt: 'RUT',
  '1sm': '1SA', '2sm': '2SA', '1rs': '1KI', '2rs': '2KI', '1cr': '1CH', '2cr': '2CH',
  ed: 'EZR', ne: 'NEH', et: 'EST', job: 'JOB', sl: 'PSA', pv: 'PRO', ec: 'ECC', ct: 'SNG',
  is: 'ISA', jr: 'JER', lm: 'LAM', ez: 'EZK', dn: 'DAN', os: 'HOS', jl: 'JOL', am: 'AMO',
  ob: 'OBA', jn: 'JON', mq: 'MIC', na: 'NAM', hc: 'HAB', sf: 'ZEP', ag: 'HAG', zc: 'ZEC',
  ml: 'MAL', mt: 'MAT', mc: 'MRK', lc: 'LUK', jo: 'JHN', at: 'ACT', rm: 'ROM', '1co': '1CO',
  '2co': '2CO', gl: 'GAL', ef: 'EPH', fp: 'PHP', cl: 'COL', '1ts': '1TH', '2ts': '2TH',
  '1tm': '1TI', '2tm': '2TI', tt: 'TIT', fm: 'PHM', hb: 'HEB', tg: 'JAS', '1pe': '1PE',
  '2pe': '2PE', '1jo': '1JN', '2jo': '2JN', '3jo': '3JN', jd: 'JUD', ap: 'REV',
}

// Longest names first so "1 João" wins over "João".
const byName = [...livros].sort((a, b) => b.nome.length - a.nome.length)

/** Builds the external reading link for the first passage in a reference like "Lucas 24:13-27". */
export function buildReadingLink(referencia: string, modelo: string): string | null {
  const ref = referencia.trim()
  const livro = byName.find((l) => ref.startsWith(l.nome + ' '))
  if (!livro) return null
  const cap = ref.slice(livro.nome.length + 1).match(/^(\d+)/)?.[1]
  const code = USFM[livro.id]
  if (!cap || !code) return null
  return modelo.replace('{LIVRO}', code).replace('{CAP}', cap)
}
