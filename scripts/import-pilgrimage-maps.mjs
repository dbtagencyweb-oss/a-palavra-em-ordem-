import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const target = 'public/media/peregrinacao'
const sources = ['media/ui', 'public/media/ui']
const widths = [128, 480, 768, 1080, 1440]
const extensions = /\.(webp|png|jpe?g|avif)$/i
const scenic = 'Imagem do ChatGPT 25 de nov. de 2026, '
const catalogue = {
  mundo: ['world_master'],
  'visao-do-todo': ['01_visao_do_todo'],
  eden: ['02_eden', '02-eden'],
  canaa: ['03_canaa', '03_canaã', '03-canaa', '03-canaã'],
  sinai: ['04_sinai', '04-sinai', '03_sinai'],
  'jerusalem-babilonia': ['05_jerusalem_babilonia'],
  galileia: ['06_galileia'],
  'nova-jerusalem': ['07_nova_jerusalem'],
  'arvore-da-vida': ['scenes/' + scenic + '21_56_06'],
  'acampamento-de-abraao': ['scenes/' + scenic + '21_57_20'],
  'mar-vermelho': ['scenes/' + scenic + '21_54_32'],
  jerusalem: ['scenes/' + scenic + '21_49_27'],
  babilonia: ['scenes/' + scenic + '21_50_29'],
  'lago-da-galileia': ['scenes/' + scenic + '21_55_10'],
}

const index = new Map()
for (const folder of sources) {
  const files = await readdir(folder, { recursive: true, withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  for (const file of files) {
    if (!file.isFile() || !extensions.test(file.name)) continue
    const path = join(file.parentPath, file.name).replaceAll('\\', '/')
    const key = path.slice(folder.length + 1).replace(extensions, '').toLowerCase()
    if (!index.has(key)) index.set(key, path)
  }
}

await mkdir(target, { recursive: true })
const assets = {}
const rows = []
for (const [id, candidates] of Object.entries(catalogue)) {
  const source = candidates.map((name) => index.get(name.toLowerCase())).find(Boolean)
  if (!source) {
    console.warn(`Arte ausente: ${id}`)
    continue
  }
  const { width, height, format } = await sharp(source).metadata()
  const originalBytes = (await stat(source)).size
  const variants = []
  for (const requested of [...widths.filter((size) => size < width), width]) {
    // Already compressed public WebP: keep its best available detail without another lossy pass.
    if (requested === width && format === 'webp' && source.startsWith('public/')) {
      variants.push({ path: encodeURI(source.slice('public'.length)), width, height, bytes: originalBytes })
      continue
    }
    const path = `${target}/${id}-${requested}.webp`
    const image = await sharp(source).rotate().resize({ width: requested, withoutEnlargement: true })
      .webp({ quality: requested <= 128 ? 76 : 85, smartSubsample: true, effort: 5 })
      .toFile(path)
    variants.push({ path: '/' + path.slice('public/'.length), width: image.width, height: image.height, bytes: image.size })
  }
  const [preview, ...larger] = variants
  assets[id] = { width, height, preview, variants: larger.length ? larger : [preview] }
  rows.push({ source, width, height, originalBytes, variants })
}

if (!assets.mundo) throw new Error('O mapa-mestre world_master é necessário para gerar o catálogo.')
await writeFile('content/pilgrimage-assets.json', JSON.stringify(assets, null, 2) + '\n')

const kib = (bytes) => (bytes / 1024).toFixed(1).replace('.', ',')
const report = rows.map(({ source, width, height, originalBytes, variants }) => {
  const sizes = variants.map((v) => `${v.width} × ${v.height} · ${kib(v.bytes)} KiB`).join('<br>')
  const reduction = variants.map((v) => `${((1 - v.bytes / originalBytes) * 100).toFixed(1).replace('.', ',')}%`).join('<br>')
  return `| \`${source.replace(/^public\//, '')}\` | ${width} × ${height} | ${kib(originalBytes)} KiB | ${sizes} | ${reduction} |`
}).join('\n')
await writeFile('docs/peregrinacao-assets.md', `# Imagens da peregrinação\n\nCompare cada variante com o WebP fornecido. A maior resolução reutiliza o WebP aprovado quando ele já está na pasta pública. Os tamanhos representam alternativas de carregamento.\n\n| Arquivo de origem | Resolução | Tamanho de origem | Variantes | Redução por variante |\n| --- | --- | --- | --- | --- |\n${report}\n`)
