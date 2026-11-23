// Print routes for the "Mapa da Bíblia para imprimir" bump (docs/07, Prompt 5). They render the
// poster and the wallpapers from the app's own data; npm run print:export turns them into files.
//   /print/mapa-a3       poster, A3 portrait, 10 mm margins
//   /print/mapa-a4       the same poster, compacted to A4 (A4 is A3 scaled by 1/√2)
//   /print/wallpaper-1   the map          1080 × 1920
//   /print/wallpaper-2   the lamp         1080 × 1920 (Salmo 119:105)
//   /print/wallpaper-3   the city         1080 × 1920 (Apocalipse 21:4)
import impressao from '../../content/impressao.json'
import { livros, trilha } from '../content'
import { imagePath } from '../media/paths'
import { eraOf } from '../ui/eras'
import { Logo } from '../ui/Logo'

const t = impressao
const ERAS = trilha.dias // day n = era n (Visão do todo, Éden, Canaã, Sinai, Jerusalém e Babilônia, Galileia, Nova Jerusalém)

/** Books of an era: the main ones (livros.json "era") and the ones that continue into it (diasDoMapa). */
function booksOf(era: number) {
  const main = livros.filter((l) => (l as { era?: number }).era === era)
  const cont = livros.filter((l) => (l as { era?: number }).era !== era && (l.diasDoMapa ?? []).includes(era))
  return { main, cont }
}

export function PrintPage({ route }: { route: string }) {
  if (route === 'mapa-a3') return <Poster page="A3" />
  if (route === 'mapa-a4') return <Poster page="A4" />
  if (route === 'wallpaper-1') return <WallpaperMap />
  if (route === 'wallpaper-2') return <WallpaperQuote image="era-d1" position="50% 62%" {...t.wallpapers.lampada} />
  if (route === 'wallpaper-3') return <WallpaperQuote image="era-d7" position="50% 40%" {...t.wallpapers.cidade} />
  return <p style={{ padding: 40, fontFamily: 'Manrope, sans-serif' }}>Página de impressão desconhecida: {route}</p>
}

// ---------- Poster ----------

function Poster({ page }: { page: 'A3' | 'A4' }) {
  // Drawn at A3 (277 × 400 mm inside the margins); A4 is the same drawing at 1/√2.
  const scale = page === 'A3' ? 1 : Math.SQRT1_2
  return (
    <>
      <style>{`
        @page { size: ${page} portrait; margin: 10mm; }
        html, body, #root { background: #F5EFE3; margin: 0; height: auto; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
      <div style={{ width: `${277 * scale}mm`, height: `${400 * scale}mm`, overflow: 'hidden', margin: '0 auto' }}>
        <div
          data-testid="poster"
          className="flex flex-col bg-paper text-ink"
          style={{ width: '277mm', height: '400mm', transform: `scale(${scale})`, transformOrigin: 'top left', fontSize: '3.6mm' }}
        >
          <header className="flex items-end justify-between border-b-[0.5mm] border-gold pb-[5mm]">
            <div>
              <h1 className="font-display font-semibold leading-none" style={{ fontSize: '15mm' }}>
                {t.poster.titulo}
              </h1>
              <p className="mt-[2.5mm] font-serif italic text-ink-2" style={{ fontSize: '5mm' }}>
                {t.poster.subtitulo}
              </p>
            </div>
            <Logo variant="full" title={null} className="text-ink" style={{ width: '52mm' }} />
          </header>

          {/* The seven medals. */}
          <div className="mt-[4mm] grid grid-cols-7 gap-[3mm]">
            {ERAS.map((d) => (
              <div key={d.n} className="flex flex-col items-center text-center">
                <img src={imagePath(`simbolo-${d.simbolo.id}`)} alt="" style={{ width: '17mm', height: '17mm' }} />
                <span className="mt-[1mm] font-semibold" style={{ fontSize: '3mm' }}>
                  {d.simbolo.nome}
                </span>
              </div>
            ))}
          </div>

          {/* The seven eras, with the timeline on the left and the books in each one. */}
          <div className="relative mt-[5mm] flex flex-1 flex-col gap-[2mm]">
            <span className="absolute bottom-[6mm] left-[7mm] top-[6mm] w-[0.6mm] bg-gold/60" aria-hidden="true" />
            {ERAS.map((d) => {
              const era = eraOf(d.n)
              const { main, cont } = booksOf(d.n)
              // Height by rows of books (about 10 per row), so the long eras get room without empty space.
              const weight = 1 + Math.ceil((main.length + cont.length) / 10) * 0.45
              return (
                <section key={d.n} className="relative flex overflow-hidden rounded-[3mm]" style={{ flexGrow: weight, flexBasis: 0, background: `${era.mid}14` }}>
                  <img src={imagePath(`era-d${d.n}`)} alt="" className="absolute inset-y-0 right-0 h-full w-[55%] object-cover" style={{ opacity: 0.22, maskImage: 'linear-gradient(to right, transparent, #000 45%)', WebkitMaskImage: 'linear-gradient(to right, transparent, #000 45%)' }} />
                  <div className="relative flex w-[62mm] flex-none items-start gap-[3mm] p-[3mm]">
                    <span className="grid flex-none place-items-center rounded-full font-display font-semibold text-white" style={{ width: '8.5mm', height: '8.5mm', background: era.mid, fontSize: '4.2mm', boxShadow: '0 0 0 1mm #F5EFE3' }}>
                      {d.n}
                    </span>
                    <div>
                      <strong className="block font-display font-semibold leading-tight" style={{ fontSize: '5.2mm', color: era.deep }}>
                        {d.lugar}
                      </strong>
                      <span className="block leading-snug text-ink-2" style={{ fontSize: '3.3mm' }}>
                        {d.titulo}
                      </span>
                      <span className="mt-[0.8mm] block leading-snug text-ink-3" style={{ fontSize: '2.8mm' }}>
                        {d.base}
                      </span>
                    </div>
                  </div>
                  <ul className="relative flex flex-1 flex-wrap content-center items-center gap-[1.6mm] py-[3mm] pr-[3mm]">
                    {d.n === 1 && <li className="font-serif italic text-ink-2" style={{ fontSize: '3.6mm' }}>{t.poster.intro}</li>}
                    {main.map((l) => (
                      <li key={l.id} className="rounded-full bg-card px-[2.4mm] py-[0.9mm] font-semibold shadow-[0_0.3mm_0_rgba(0,0,0,0.08)]" style={{ fontSize: '3mm', border: `0.35mm solid ${era.mid}` }}>
                        {l.nome}
                      </li>
                    ))}
                    {cont.map((l) => (
                      <li key={`c-${l.id}`} className="rounded-full px-[2.4mm] py-[0.9mm] text-ink-2" style={{ fontSize: '3mm', border: `0.35mm dashed ${era.mid}` }}>
                        {l.nome}
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>

          <footer className="mt-[4mm] flex items-center justify-between text-ink-3" style={{ fontSize: '3mm' }}>
            <span className="flex items-center gap-[4mm]">
              <span className="inline-flex items-center gap-[1.5mm]">
                <span className="inline-block rounded-full bg-card" style={{ width: '7mm', height: '3.5mm', border: '0.35mm solid #B8893A' }} /> {t.poster.legendaPrincipal}
              </span>
              <span className="inline-flex items-center gap-[1.5mm]">
                <span className="inline-block rounded-full" style={{ width: '7mm', height: '3.5mm', border: '0.35mm dashed #B8893A' }} /> {t.poster.legendaContinua}
              </span>
            </span>
            <span>{t.poster.rodape}</span>
          </footer>
        </div>
      </div>
    </>
  )
}

// ---------- Wallpapers (1080 × 1920) ----------

const WALL = { width: 1080, height: 1920 }
const wallCss = `html, body, #root { margin: 0; background: #1E2230; } * { -webkit-print-color-adjust: exact; }`

function WallpaperMap() {
  return (
    <div data-testid="wallpaper" className="relative flex flex-col overflow-hidden bg-ink text-paper" style={{ ...WALL, padding: '150px 80px 130px' }}>
      <style>{wallCss}</style>
      <div className="flex flex-col items-center text-center">
        <Logo variant="full" title={null} className="text-paper" style={{ width: 300 }} />
        <p className="mt-6 font-serif text-[38px] italic text-paper/80">{t.wallpapers.mapa.subtitulo}</p>
      </div>
      <ol className="mt-14 flex flex-1 flex-col gap-4">
        {ERAS.map((d) => {
          const era = eraOf(d.n)
          return (
            <li key={d.n} className="relative flex flex-1 items-center gap-7 overflow-hidden rounded-[28px] px-8" style={{ background: era.deep }}>
              <img src={imagePath(`era-d${d.n}`)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" style={{ maskImage: 'linear-gradient(to right, transparent 15%, #000 70%)', WebkitMaskImage: 'linear-gradient(to right, transparent 15%, #000 70%)' }} />
              <img src={imagePath(`simbolo-${d.simbolo.id}`)} alt="" className="relative h-[110px] w-[110px] flex-none" />
              <div className="relative">
                <strong className="block font-display text-[48px] font-semibold leading-none" style={{ color: era.light }}>
                  {d.lugar}
                </strong>
                <span className="mt-2 block text-[28px] text-paper/80">{d.titulo}</span>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function WallpaperQuote({ image, position, citacao, referencia }: { image: string; position: string; citacao: string; referencia: string }) {
  return (
    <div data-testid="wallpaper" className="relative overflow-hidden bg-ink text-paper" style={WALL}>
      <style>{wallCss}</style>
      <img src={imagePath(image)} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: position }} />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(30,34,48,0.88)_0%,rgba(30,34,48,0.55)_30%,rgba(30,34,48,0)_55%,rgba(30,34,48,0)_80%,rgba(30,34,48,0.6)_100%)]" />
      {/* The top is left calm on purpose: phones put the clock there; the quote sits below it. */}
      <div className="absolute inset-x-0 top-[430px] px-[110px] text-center">
        <p className="font-serif text-[72px] italic leading-[1.2]">“{citacao}”</p>
        <p className="mt-8 text-[30px] font-bold uppercase tracking-[0.18em] text-gold-soft">{referencia}</p>
      </div>
      <div className="absolute inset-x-0 bottom-[120px] flex justify-center">
        <Logo variant="full" title={null} className="text-paper" style={{ width: 210, opacity: 0.9 }} />
      </div>
    </div>
  )
}
