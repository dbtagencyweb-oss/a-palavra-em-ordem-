import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const email = 'comprador@example.com'
const originalPassword = 'senha-inicial-teste'
const newPassword = 'nova-senha-teste'

async function mockAccount(context: BrowserContext, options: { newBuyer?: boolean } = {}) {
  let password = options.newBuyer ? '' : originalPassword
  let confirmedPurchase = !options.newBuyer
  let recoveryRequested = false
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'email' },
    user_metadata: options.newBuyer ? {} : { name: 'Maria' },
    created_at: '2026-11-20T14:00:00Z',
  }
  const jwt = Buffer.from(JSON.stringify({ sub: user.id, email, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')
  const session = () => ({
    access_token: 'eyJhbGciOiJIUzI1NiJ9.' + jwt + '.test',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'local-test-token',
    user,
  })

  await context.route('https://pao-account-test.invalid/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
      'access-control-expose-headers': 'x-supabase-api-version',
      'x-supabase-api-version': '2024-01-01',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const body = request.postDataJSON()
    const json = (data: unknown, status = 200) => route.fulfill({ json: data, status, headers })
    const deny = (code: string) => json({ code, error_code: code, msg: code }, 400)

    switch (url.pathname) {
      case '/auth/v1/token':
        return password && body.email === email && body.password === password
          ? json(session()) : deny('invalid_credentials')
      case '/auth/v1/otp':
        expect(body.email).toBe(email)
        expect(url.searchParams.get('redirect_to')).toMatch(/\/ativar-conta$/)
        return json({})
      case '/auth/v1/recover':
        expect(body.email).toBe(email)
        expect(url.searchParams.get('redirect_to')).toMatch(/\/recuperar-senha$/)
        recoveryRequested = true
        return json({})
      case '/auth/v1/verify':
        if (body.type === 'email' && body.token_hash === 'ativacao-teste') return json(session())
        if (recoveryRequested && body.type === 'recovery' && body.token_hash === 'recuperacao-teste') {
          password = ''
          return json(session())
        }
        return deny('otp_expired')
      case '/auth/v1/user':
        if (request.method() === 'PUT') {
          if (body.password && password && body.current_password !== password) return deny('current_password_mismatch')
          if (body.password) password = body.password
          if (body.data) user.user_metadata = { ...user.user_metadata, ...body.data }
        }
        return json(user)
      case '/auth/v1/logout':
        expect(url.searchParams.get('scope')).toBe('local')
        return json({})
      case '/rest/v1/rpc/my_entitlements':
        return json(confirmedPurchase
          ? [{ product_code: 'fundador', status: 'ativo', expires_at: '2099-01-01T00:00:00Z', preco_fundador: true }]
          : [])
      case '/rest/v1/diary_entries':
        return json([])
      case '/rest/v1/progress':
        return json(null)
      default:
        return json(null)
    }
  })
  return { confirmPurchase: () => { confirmedPurchase = true } }
}

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })

async function logIn(page: Page, password: string) {
  await page.getByLabel('E-mail da compra', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await button(page, 'Entrar').click()
}

test('entra, consulta e edita os dados, troca a senha, sai e entra novamente', async ({ page, context }) => {
  await mockAccount(context)
  await page.goto('/')
  await button(page, 'Já tenho conta').click()
  await logIn(page, originalPassword)
  await button(page, 'Continuar para a jornada').click()
  await button(page, 'Perfil').click()
  const account = page.getByTestId('minha-conta')
  await expect(account).toContainText('Maria')
  await expect(account).toContainText(email)
  await expect(account).toContainText('Conta criada em')
  await expect(page.getByTestId('meu-plano')).toHaveAttribute('data-plano', 'fundador')

  await button(page, 'Editar nome').click()
  await page.getByLabel('Seu nome').fill('Maria Silva')
  await button(page, 'Salvar nome').click()
  await expect(account).toContainText('Nome atualizado.')
  await expect(account).toContainText('Maria Silva')

  await button(page, 'Alterar senha').click()
  await page.getByLabel('Senha atual', { exact: true }).fill('senha-incorreta')
  await page.getByLabel('Nova senha', { exact: true }).fill(newPassword)
  await page.getByLabel('Confirme a nova senha').fill(newPassword)
  await button(page, 'Salvar nova senha').click()
  await expect(account.getByRole('alert')).toHaveText('A senha atual está incorreta.')
  await page.getByLabel('Senha atual', { exact: true }).fill(originalPassword)
  await button(page, 'Salvar nova senha').click()
  await expect(account).toContainText('Senha alterada.')

  await button(page, 'Sair').click()
  await expect(account).not.toContainText('Maria Silva')
  await expect(page.getByTestId('meu-plano')).toHaveAttribute('data-plano', 'gratuito')
  await page.goto('/entrar')
  await logIn(page, originalPassword)
  await expect(page.getByRole('alert')).toContainText('Confira o e-mail e a senha')
  await logIn(page, newPassword)
  await button(page, 'Continuar para a jornada').click()
  await button(page, 'Perfil').click()
  await expect(account).toContainText('Maria Silva')

  await page.reload()
  await button(page, 'Perfil').click()
  await expect(account).toContainText('Maria Silva')
  await expect(page.getByTestId('meu-plano')).toHaveAttribute('data-plano', 'fundador')
})

test('ativa a conta com uma compra confirmada e recupera a senha por e-mail', async ({ page, context }) => {
  const { confirmPurchase } = await mockAccount(context, { newBuyer: true })
  await page.goto('/obrigado')
  await page.getByLabel('E-mail da compra').fill(email)
  await button(page, 'Receber link de primeiro acesso').click()
  await expect(page.getByRole('status')).toContainText('Enviamos um link')

  await page.goto('/ativar-conta?token_hash=ativacao-teste')
  await button(page, 'Confirmar e-mail').click()
  await expect(page.getByText(/aguardando a confirmação da compra/)).toBeVisible()
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveCount(0)
  confirmPurchase()
  await button(page, 'Verificar compra').click()
  await page.getByLabel('Seu nome').fill('Maria')
  await page.getByLabel('Nova senha', { exact: true }).fill(originalPassword)
  await page.getByLabel('Confirme sua senha').fill(originalPassword)
  await button(page, 'Salvar senha').click()
  await expect(page.getByRole('status')).toContainText('Senha salva')

  await page.goto('/entrar')
  await button(page, 'Continuar para a jornada').click()
  await button(page, 'Perfil').click()
  await expect(page.getByTestId('minha-conta')).toContainText('Maria')
  await button(page, 'Sair').click()
  await button(page, 'Esqueci minha senha').click()
  await page.getByLabel('E-mail da sua conta').fill(email)
  await button(page, 'Receber link de recuperação').click()
  await expect(page.getByRole('status')).toContainText('você receberá um link')

  await page.goto('/recuperar-senha?token_hash=recuperacao-teste')
  await button(page, 'Confirmar e-mail').click()
  await page.getByLabel('Nova senha', { exact: true }).fill(newPassword)
  await page.getByLabel('Confirme sua senha').fill(newPassword)
  await button(page, 'Salvar senha').click()
  await expect(page.getByRole('status')).toContainText('Senha salva')
})
