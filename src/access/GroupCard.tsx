// Home card of the Licença Igreja (docs/07, Prompt 10).
//  - Member: "Você está lendo com [grupo]" and the group's collective lamp (lamps lit today out of
//    everyone), which glows brighter the more of the group has read.
//  - Leader: the same, and it opens the panel (/grupo).
import { motion, useReducedMotion } from 'framer-motion'
import { LampIcon } from '../ui/icons'
import { useChurchGroup } from './group'

export function GroupCard({ onOpenPanel }: { onOpenPanel(): void }) {
  const { group } = useChurchGroup()
  const reduced = useReducedMotion()
  if (!group.papel || !group.ativo) return null
  const { acesas = 0, total = 0 } = group.lampada ?? {}
  const ratio = total ? acesas / total : 0
  const leader = group.papel === 'lider'

  const body = (
    <>
      {/* Collective lamp: the glow grows with the share of the group that read today. */}
      <span className="relative grid h-14 w-14 flex-none place-items-center" aria-hidden="true">
        <motion.span
          className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(242,190,110,0.85),rgba(242,190,110,0)_70%)]"
          style={{ opacity: 0.15 + ratio * 0.85, scale: 0.6 + ratio * 0.5 }}
          animate={reduced || !acesas ? undefined : { opacity: [0.15 + ratio * 0.7, 0.15 + ratio * 0.85, 0.15 + ratio * 0.7] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <LampIcon className={`relative h-8 w-8 ${acesas ? 'text-gold-soft' : 'text-paper/35'}`} />
      </span>
      <span className="min-w-0 flex-1">
        <small className="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-gold-soft/80">{leader ? 'Painel do grupo' : 'Seu grupo'}</small>
        <strong className="block font-display text-[17px] leading-tight">
          {leader ? group.nome : `Você está lendo com ${group.nome}`}
        </strong>
        <span className="text-[12.5px] text-paper/70">
          {acesas} de {total} {total === 1 ? 'lâmpada acesa' : 'lâmpadas acesas'} hoje
        </span>
      </span>
      {leader && (
        <span className="text-gold-soft" aria-hidden="true">
          ›
        </span>
      )}
    </>
  )

  const cls = 'mx-5 mb-3 mt-2 flex flex-none items-center gap-3 rounded-card bg-ink p-3.5 text-left text-paper shadow-card'
  return leader ? (
    <button type="button" onClick={onOpenPanel} className={`${cls} w-[calc(100%-2.5rem)]`} data-testid="cartao-grupo" data-papel="lider">
      {body}
    </button>
  ) : (
    <div className={cls} data-testid="cartao-grupo" data-papel="membro" role="group" aria-label={`Você está lendo com ${group.nome}: ${acesas} de ${total} lâmpadas acesas hoje`}>
      {body}
    </div>
  )
}
