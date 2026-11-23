import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('draws the full logo with letters, rules and flame', () => {
    const { container, getByRole } = render(<Logo />)
    expect(getByRole('img', { name: 'A Palavra em Ordem' })).toBeTruthy()
    expect(container.querySelectorAll('path').length).toBe(10)
  })

  it('draws only the flame for the mark', () => {
    const { container } = render(<Logo variant="mark" title={null} />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll('path').length).toBe(1)
  })

  it('keeps gradient ids unique between instances', () => {
    const { container } = render(
      <>
        <Logo variant="icon" />
        <Logo variant="icon" />
      </>,
    )
    const ids = [...container.querySelectorAll('linearGradient')].map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
