import { ui } from '../content'

const t = ui.guiaVerbo

/** GuiaVerbo: "coming soon" commands with the fixed notice. */
export function GuideScreen() {
  return (
    <section className="screen pb-[calc(84px+env(safe-area-inset-bottom))]">
      <header className="px-5 pb-2 pt-[22px]">
        <h2 className="text-[26px]">{t.titulo}</h2>
        <p className="mt-1.5 text-sm leading-normal text-ink-2">{t.texto}</p>
      </header>
      <p role="note" className="mx-5 mb-4 rounded-btn bg-gold-soft px-4 py-3.5 text-[13px] leading-normal text-[#6A4E1C]">
        {t.aviso}
      </p>
      <ul className="grid grid-cols-2 gap-2.5 px-5">
        {t.comandos.map((c) => (
          <li
            key={c}
            aria-disabled="true"
            className="flex min-h-[84px] flex-col justify-between rounded-btn border border-line bg-card p-3.5 text-[13.5px] font-semibold leading-[1.35] opacity-85"
          >
            {c}
            <span className="text-[11px] font-medium text-ink-3">{t.emBreve}</span>
          </li>
        ))}
      </ul>
      <p className="mx-5 mb-6 mt-[18px] rounded-btn bg-ink p-4 text-[13.5px] leading-normal text-paper">
        <b className="text-gold">{t.fase.rotulo}</b> {t.fase.texto}
      </p>
    </section>
  )
}
