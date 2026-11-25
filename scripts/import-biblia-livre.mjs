import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'

const archive = process.argv[2]
if (!archive) throw new Error('Informe o ZIP VPL da edição porbr2018 do eBible.')

const text = execFileSync('tar', ['-xOf', archive, 'porbr2018_vpl.txt'], {
  encoding: 'utf8',
  maxBuffer: 12 * 1024 * 1024,
})
const books = new Map()
for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
  if (!line.trim()) continue
  const match = /^([A-Z0-9]{3}) (\d+):(\d+) (.+)$/.exec(line)
  if (!match) throw new Error(`Linha VPL inválida: ${line.slice(0, 30)}`)
  const [, code, chapter, verse, passage] = match
  if (!books.has(code)) books.set(code, {})
  const chapters = books.get(code)
  chapters[chapter] ??= []
  chapters[chapter].push([Number(verse), passage])
}

const catalog = JSON.parse(readFileSync('content/livros.json', 'utf8')).livros
const codes = new Map([...readFileSync('src/content/readingLink.ts', 'utf8')
  .matchAll(/(?:'([a-z0-9]+)'|\b([a-z0-9]+)): '([A-Z0-9]{3})'/g)]
  .map(([, quoted, bare, code]) => [quoted ?? bare, code]))
// The VPL export uses these BibleWorks codes instead of USFM.
const aliases = { SNG: 'SOL', EZK: 'EZE', JOL: 'JOE', MRK: 'MAR', JHN: 'JOH',
  PHP: 'PHI', JAS: 'JAM', NAM: 'NAH', '1JN': '1JO', '2JN': '2JO', '3JN': '3JO' }
const chaptersFor = (id) => {
  const code = codes.get(id)
  return books.get(aliases[code] ?? code)
}
if (books.size !== catalog.length) throw new Error('Quantidade de livros diferente do catálogo.')
for (const book of catalog) {
  const chapters = chaptersFor(book.id)
  if (!chapters || Object.keys(chapters).length !== book.capitulos ||
      !Array.from({ length: book.capitulos }, (_, i) => chapters[i + 1]?.length).every(Boolean)) {
    throw new Error(`Capítulos ausentes ou inesperados em ${book.nome}.`)
  }
}

const output = 'public/biblia-livre/2018'
mkdirSync(output, { recursive: true })
for (const book of catalog) {
  writeFileSync(`${output}/${book.id}.json`, JSON.stringify(chaptersFor(book.id)) + '\n')
}
console.log(`Importados ${books.size} livros e ${catalog.reduce((sum, book) => sum + book.capitulos, 0)} capítulos.`)
