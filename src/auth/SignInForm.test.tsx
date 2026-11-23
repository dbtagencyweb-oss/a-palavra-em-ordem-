import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const sendMagicLink = vi.fn().mockResolvedValue({})
const signInWithGoogle = vi.fn().mockResolvedValue({})
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ enabled: true, session: null, sendMagicLink, signInWithGoogle }),
}))

const { SignInForm } = await import('./SignInForm')

describe('SignInForm', () => {
  it('starts Google sign-in', () => {
    render(<SignInForm origem="teste" />)
    fireEvent.click(screen.getByRole('button', { name: /Continuar com Google/ }))
    expect(signInWithGoogle).toHaveBeenCalled()
  })

  it('asks to fix an invalid e-mail without calling the server', () => {
    render(<SignInForm origem="teste" />)
    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'nao-e-email' } })
    fireEvent.click(screen.getByRole('button', { name: 'Receber meu link de acesso' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Confira o e-mail')
    expect(sendMagicLink).not.toHaveBeenCalled()
  })

  it('sends the magic link and tells the user to check their inbox', async () => {
    render(<SignInForm origem="teste" />)
    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'pessoa@exemplo.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Receber meu link de acesso' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Pronto!\s*Abra o link que enviamos para pessoa@exemplo\.com\. Pode fechar esta tela\./))
    expect(sendMagicLink).toHaveBeenCalledWith('pessoa@exemplo.com')
    // Resend waits 30 s; the spam tip is there.
    expect(screen.getByRole('button', { name: /Reenviar em 30 s/ })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Spam ou Promoções')
  })

  it('the sign-in link comes back with the audience and the campaign, nothing else', async () => {
    const { redirectTo } = await vi.importActual<typeof import('./AuthContext')>('./AuthContext')
    const url = new URL(redirectTo('?start=1&publico=inicio&utm_source=ig&fbclid=x'))
    expect(url.pathname).toBe('/')
    expect(url.searchParams.get('publico')).toBe('inicio')
    expect(url.searchParams.get('utm_source')).toBe('ig')
    expect(url.searchParams.has('fbclid')).toBe(false)
  })
})

describe('checkoutUrl', () => {
  it('adds the account id and the origin', async () => {
    const { checkoutUrl } = await import('./useFounder')
    const url = new URL(checkoutUrl('https://pay.hotmart.com/ABC123?off=x1', 'user-1', 'home'))
    expect(url.searchParams.get('off')).toBe('x1')
    expect(url.searchParams.get('xcod')).toBe('user-1')
    expect(url.searchParams.get('sck')).toBe('app_home')
    expect(new URL(checkoutUrl('https://pay.hotmart.com/ABC123', null, 'home')).searchParams.has('xcod')).toBe(false)
  })
})
