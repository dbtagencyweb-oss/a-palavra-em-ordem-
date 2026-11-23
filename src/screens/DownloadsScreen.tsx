// /downloads: the files of the "Mapa da Bíblia para imprimir" bump. Only people with the
// mapa-impresso entitlement see the buttons; each button asks for a fresh signed link (10 min).
import { useState } from 'react'
import impressao from '../../content/impressao.json'
import { useAccess } from '../access/AccessContext'
import { downloadUrl } from '../access/downloads'
import { useAuth } from '../auth/AuthContext'
import { SignInForm } from '../auth/SignInForm'
import { BackIcon, LockIcon } from '../ui/icons'
import { useToast } from '../ui/Toast'

const t = impressao.downloads

export function DownloadsScreen({ onBack }: { onBack(): void }) {
  const auth = useAuth()
  const { podeAcessar } = useAccess()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const needsSignIn = auth.enabled && !auth.session
  const allowed = podeAcessar('download-mapa-impresso')

  async function get(file: string) {
    setBusy(file)
    const url = await downloadUrl(file)
    setBusy(null)
    if (!url) return toast('Não foi possível gerar o link. Tente de novo em instantes.')
    window.location.assign(url)
  }

  return (
    <section className="screen bg-paper" data-testid="downloads">
      <div className="flex-none">
        <header className="flex items-center px-3 pt-3">
          <button type="button" onClick={onBack} aria-label="Voltar" className="grid h-11 w-11 place-items-center rounded-full text-ink-2">
            <BackIcon />
          </button>
        </header>
        <div className="px-5 pb-2">
          <h2 className="text-[26px] leading-tight">{t.titulo}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{t.texto}</p>
        </div>

        {needsSignIn ? (
          <div className="mx-5 mt-4 rounded-card bg-card p-4 shadow-card">
            <p className="mb-3 text-[14.5px] text-ink-2">{t.entrar}</p>
            <SignInForm origem="downloads" />
          </div>
        ) : !allowed ? (
          <div className="mx-5 mt-4 flex items-center gap-3 rounded-card border border-line bg-card p-4" data-testid="downloads-bloqueado">
            <LockIcon size={18} className="flex-none text-ink-3" />
            <p className="text-[14.5px] text-ink-2">{t.semAcesso}</p>
          </div>
        ) : (
          <>
            <ul className="mx-5 mt-4 divide-y divide-line overflow-hidden rounded-card bg-card shadow-card">
              {t.arquivos.map((a) => (
                <li key={a.arquivo} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <strong className="block text-[15px]">{a.nome}</strong>
                    <span className="text-[12.5px] text-ink-3">{a.detalhe}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void get(a.arquivo)}
                    disabled={busy !== null}
                    aria-label={`Baixar ${a.nome}`}
                    className="btn-shine min-h-11 flex-none rounded-btn px-4 text-sm font-bold disabled:opacity-50"
                  >
                    {busy === a.arquivo ? '…' : 'Baixar'}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mx-5 mt-3 text-[12.5px] text-ink-3">{t.aviso}</p>
          </>
        )}
      </div>
    </section>
  )
}
