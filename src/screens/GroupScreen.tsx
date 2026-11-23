// /grupo: the leader's panel of the Licença Igreja (docs/07, Prompt 10).
// How many read today, the group's average lamp, where each person is in the journey, a question
// for this week's meeting (taken from the lesson most of the group is on) and the invite link.
// Privacy: the panel only has first names and progress (see logic-group.ts). The screen says so.
import { useEffect, useMemo, useState } from 'react'
import { groupInviteMessage, panelSummary, weekLesson } from '../../supabase/functions/_shared/logic-group'
import { groupLink, useChurchGroup } from '../access/group'
import { trailById } from '../content/trails'
import { BackIcon, CheckIcon, LampIcon } from '../ui/icons'
import { useToast } from '../ui/Toast'

const TRAIL_NAMES: Record<string, string> = {
  'mapa-7-dias': 'Mapa da Bíblia',
  'jesus-em-ordem': 'Jesus em Ordem',
  'biblia-em-ordem': 'A Bíblia em Ordem',
}
const where = (trilha: string | null, dia: number) => (trilha ? `${TRAIL_NAMES[trilha] ?? trilha} · Dia ${dia}` : 'Ainda não começou')
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

export function GroupScreen({ onBack }: { onBack(): void }) {
  const { group, panel, rename, newLink, remove } = useChurchGroup()
  const toast = useToast()
  const summary = useMemo(() => panelSummary(panel), [panel])
  const lesson = weekLesson(summary)
  const [question, setQuestion] = useState<{ titulo: string; pergunta: string } | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')

  // This week's question: the reflection of the lesson most of the group is on.
  useEffect(() => {
    setQuestion(null)
    if (!lesson) return
    let alive = true
    const trail = trailById(lesson.trilha)
    void trail.loadDay(lesson.dia).then((d) => {
      const card = d?.cards.find((c) => c.tipo === 'reflexao') as { pergunta?: string } | undefined
      if (alive && d && card?.pergunta) setQuestion({ titulo: `${where(lesson.trilha, lesson.dia)}: ${d.titulo}`, pergunta: card.pergunta })
    })
    return () => {
      alive = false
    }
  }, [lesson?.trilha, lesson?.dia]) // eslint-disable-line react-hooks/exhaustive-deps

  if (group.papel !== 'lider') {
    return (
      <section className="screen bg-paper" data-testid="painel-grupo">
        <Header onBack={onBack} />
        <p className="mx-5 mt-4 rounded-card bg-card p-4 text-[14px] text-ink-2 shadow-card">
          O painel é do líder do grupo. Quem compra a Licença Igreja vê aqui o andamento do grupo.
        </p>
      </section>
    )
  }

  const link = group.codigo ? groupLink(group.codigo) : ''
  async function copy(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast(msg)
    } catch {
      toast('Não deu para copiar. Selecione e copie o texto.')
    }
  }

  return (
    <section className="screen bg-paper pb-[calc(90px+env(safe-area-inset-bottom))]" data-testid="painel-grupo">
      <div className="flex-none">
        <Header onBack={onBack} />

        {/* Name and seats. */}
        <div className="px-5 pb-1">
          <small className="eyebrow block">Painel do líder</small>
          {editing ? (
            <form
              className="mt-1 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (name.trim().length < 2) return
                void rename(name.trim()).then(() => setEditing(false))
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                aria-label="Nome do grupo"
                className="min-h-11 flex-1 rounded-btn border border-line bg-card px-3 text-[16px]"
                autoFocus
              />
              <button type="submit" className="btn-shine min-h-11 rounded-btn px-4 text-sm font-bold">
                Salvar
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => (setName(group.nome ?? ''), setEditing(true))} className="mt-1 text-left" aria-label="Mudar o nome do grupo">
              <h2 className="text-[28px] leading-tight">
                {group.nome} <span className="align-middle text-[13px] font-semibold text-ink-3 underline">mudar</span>
              </h2>
            </button>
          )}
          <p className="mt-1 text-[13px] text-ink-3">
            {group.membros} de {group.vagas} vagas usadas
            {group.vencimento ? ` · Licença até ${fmtDate(group.vencimento)}` : ''}
          </p>
        </div>

        {/* Today. */}
        <div className="mx-5 mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-card bg-ink p-4 text-paper shadow-card" data-testid="leram-hoje">
            <strong className="block font-display text-[32px] leading-none">
              {summary.leramHoje}
              <span className="text-[16px] text-paper/60"> de {summary.total}</span>
            </strong>
            <span className="mt-1 block text-[12.5px] text-paper/75">leram a lição hoje</span>
          </div>
          <div className="rounded-card bg-card p-4 shadow-card">
            <strong className="flex items-center gap-1.5 font-display text-[32px] leading-none">
              <LampIcon className="h-6 w-6 text-ember" /> {String(summary.sequenciaMedia).replace('.', ',')}
            </strong>
            <span className="mt-1 block text-[12.5px] text-ink-3">dias de lâmpada, em média</span>
          </div>
        </div>

        {/* Question for the meeting. */}
        <div className="mx-5 mt-3 rounded-card border border-gold/40 bg-[#FBF4E2] p-4" data-testid="pergunta-semana">
          <small className="eyebrow block">Pergunta da semana</small>
          {question ? (
            <>
              <p className="mt-2 font-display text-[19px] leading-snug text-ink">{question.pergunta}</p>
              <p className="mt-2 text-[12px] text-ink-3">Da lição em que a maior parte do grupo está: {question.titulo}</p>
              <button type="button" onClick={() => void copy(question.pergunta, 'Pergunta copiada')} className="mt-3 min-h-11 text-[13px] font-bold text-ember-ink underline">
                Copiar a pergunta
              </button>
            </>
          ) : (
            <p className="mt-2 text-[14px] text-ink-2">Assim que o grupo começar as lições, a pergunta para a reunião aparece aqui.</p>
          )}
        </div>

        {/* Where the group is. */}
        <h3 className="px-5 pb-2 pt-6 text-lg">Onde o grupo está</h3>
        <div className="mx-5 rounded-card bg-card p-4 shadow-card">
          {summary.distribuicao.length === 0 && summary.naoComecaram === 0 ? (
            <p className="text-[14px] text-ink-2">Ninguém entrou ainda. Mande o link abaixo para o grupo.</p>
          ) : (
            <ul className="space-y-2.5" aria-label="Pessoas em cada dia da jornada">
              {summary.distribuicao.map((d) => (
                <Bar key={`${d.trilha}:${d.dia}`} label={where(d.trilha, d.dia)} n={d.pessoas} total={summary.total} />
              ))}
              {summary.naoComecaram > 0 && <Bar label="Ainda não começou" n={summary.naoComecaram} total={summary.total} muted />}
            </ul>
          )}
        </div>

        {/* Invite. */}
        <h3 className="px-5 pb-2 pt-6 text-lg">Convide o grupo</h3>
        <div className="mx-5 rounded-card bg-card p-4 shadow-card">
          <p className="text-[13.5px] text-ink-2">Quem entrar por este link ganha o acesso completo enquanto a licença estiver ativa.</p>
          <p className="mt-2 break-all rounded-btn bg-paper-2 px-3 py-2 font-mono text-[12.5px]" data-testid="link-grupo">
            {link}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(groupInviteMessage(group.nome ?? '', link))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-shine grid min-h-11 place-items-center rounded-btn px-3 text-sm font-bold"
            >
              Enviar no WhatsApp
            </a>
            <button type="button" onClick={() => void copy(link, 'Link copiado')} className="min-h-11 rounded-btn border-[1.5px] border-line px-3 text-sm font-bold">
              Copiar link
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Gerar um novo link? O link atual para de funcionar. Quem já entrou continua no grupo.')) void newLink().then(() => toast('Novo link gerado'))
            }}
            className="mt-2 min-h-11 text-[13px] font-semibold text-ink-3 underline"
          >
            Gerar um novo link
          </button>
        </div>

        {/* People. */}
        <h3 className="px-5 pb-2 pt-6 text-lg">Pessoas</h3>
        {panel.length > 0 && (
          <ul className="mx-5 divide-y divide-line overflow-hidden rounded-card bg-card shadow-card" data-testid="membros-grupo">
            {panel.map((m) => (
              <li key={m.id} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
                <span className={`grid h-9 w-9 flex-none place-items-center rounded-full ${m.leu_hoje ? 'bg-olive text-white' : 'bg-paper-2 text-ink-3'}`} aria-label={m.leu_hoje ? 'Leu hoje' : 'Ainda não leu hoje'}>
                  {m.leu_hoje ? <CheckIcon size={18} /> : <span className="text-[13px] font-bold">{m.nome.slice(0, 1)}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[15px]">{m.nome}</strong>
                  <span className="text-[12px] text-ink-3">{where(m.trilha, m.dia)}</span>
                </span>
                <span className="flex items-center gap-1 text-[13px] font-bold text-ink-2" aria-label={`${m.lampada} dias de lâmpada acesa`}>
                  <LampIcon className={`h-4 w-4 ${m.lampada ? 'text-ember' : 'text-ink-3/50'}`} /> {m.lampada}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Tirar ${m.nome} do grupo? A vaga fica livre e o acesso dessa pessoa pelo grupo termina.`)) void remove(m.id).then(() => toast(`${m.nome} saiu do grupo`))
                  }}
                  className="min-h-11 px-1 text-[12px] font-semibold text-ink-3 underline"
                  aria-label={`Tirar ${m.nome} do grupo`}
                >
                  Tirar
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mx-5 mt-3 rounded-btn bg-paper-2 p-3 text-[12.5px] leading-normal text-ink-2" data-testid="aviso-privacidade">
          Você vê só o primeiro nome e o progresso de cada pessoa. O diário, as reflexões e as respostas são só delas.
        </p>
      </div>
    </section>
  )
}

function Header({ onBack }: { onBack(): void }) {
  return (
    <header className="flex items-center gap-2 px-3 pt-3">
      <button type="button" onClick={onBack} aria-label="Voltar" className="grid h-11 w-11 place-items-center rounded-full text-ink-2">
        <BackIcon />
      </button>
    </header>
  )
}

function Bar({ label, n, total, muted = false }: { label: string; n: number; total: number; muted?: boolean }) {
  return (
    <li>
      <div className="flex justify-between text-[13px]">
        <span className={muted ? 'text-ink-3' : 'font-semibold'}>{label}</span>
        <span className="text-ink-3">
          {n} {n === 1 ? 'pessoa' : 'pessoas'}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${muted ? 'bg-ink-3/40' : 'bg-[linear-gradient(90deg,#B8893A,#E2C580)]'}`} style={{ width: `${total ? Math.max(6, (n / total) * 100) : 0}%` }} />
      </div>
    </li>
  )
}
