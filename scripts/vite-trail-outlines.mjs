// Vite plugin used by vite.config.ts (kept in plain JS so the config needs no Node type definitions).
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * virtual:trail-outlines: for every trail in content/trilhas/, only the outline of each day
 * (number, title, passages, phase, status, symbol, timeline milestone). The lesson cards of paid
 * trails never enter the app bundle; they come from the server (see src/content/trails.ts).
 */
export function trailOutlines() {
  const ID = 'virtual:trail-outlines'
  const RESOLVED = '\0' + ID
  const ROOT = 'content/trilhas'
  return {
    name: 'trail-outlines',
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return
      const out = {}
      // Trail folders, and the stages of a plan (biblia-em-ordem/etapa-01, …).
      const trails = []
      for (const d of readdirSync(ROOT)) {
        if (existsSync(join(ROOT, d, 'trilha.json'))) trails.push(d)
        else if (existsSync(join(ROOT, d, 'plano.json')))
          for (const e of readdirSync(join(ROOT, d))) if (existsSync(join(ROOT, d, e, 'trilha.json'))) trails.push(`${d}/${e}`)
      }
      for (const trail of trails) {
        const metaFile = join(ROOT, trail, 'trilha.json')
        if (!existsSync(metaFile)) continue
        this.addWatchFile(resolve(metaFile)) // absolute: a relative Windows path breaks the dev server
        const meta = JSON.parse(readFileSync(metaFile, 'utf8'))
        out[trail] = meta.dias.map(({ n, arquivo }) => {
          const file = join(ROOT, trail, arquivo)
          if (!existsSync(file)) return { n, titulo: `Dia ${n}`, status: 'rascunho' }
          this.addWatchFile(resolve(file))
          const d = JSON.parse(readFileSync(file, 'utf8'))
          return { n, titulo: d.titulo, formato: d.formato, capitulos: d.capitulos, passagens: d.passagens ?? d.leitura ?? d.base, fase: d.fase ?? d.lugar, status: d.status, simbolo: d.simbolo, marcoLinhaDoTempo: d.marcoLinhaDoTempo }
        })
      }
      // Estudos por livro: what the Loja de estudos shows. Editorial notes in trilha.json (such as
      // "orientacao") stay out of the bundle.
      const STUDY_FIELDS = ['id', 'titulo', 'subtitulo', 'descricao', 'livro', 'capa', 'preco', 'totalDias', 'revisao_pastoral', 'conclusao']
      const studyMetas = {}
      for (const trail of trails.filter((t) => t.startsWith('estudo-'))) {
        const meta = JSON.parse(readFileSync(join(ROOT, trail, 'trilha.json'), 'utf8'))
        studyMetas[trail] = Object.fromEntries(STUDY_FIELDS.filter((k) => k in meta).map((k) => [k, meta[k]]))
      }
      return `export default ${JSON.stringify(out)}\nexport const studyMetas = ${JSON.stringify(studyMetas)}`
    },
  }
}

