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
    fireEvent.click(screen.getByRole('button', { name: 'Receber link de acesso' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Confira o e-mail')
    expect(sendMagicLink).not.toHaveBeenCalled()
  })

  it('sends the magic link and tells the user to check their inbox', async () => {
    render(<SignInForm origem="teste" />)
    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'pessoa@exemplo.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Receber link de acesso' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Confira seu e-mail'))
    expect(sendMagicLink).toHaveBeenCalledWith('pessoa@exemplo.com')
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
