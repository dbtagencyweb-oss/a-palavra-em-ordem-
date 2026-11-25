# 10 · Checklist: testar o SQL e o webhook no Supabase real

Faça primeiro num **projeto Supabase de teste** (não no de produção). As migrações nunca rodaram num banco de verdade até aqui; se alguma falhar, me mande a mensagem de erro.

## 1. Ligar o projeto

```powershell
npx supabase login
```

```powershell
npx supabase link --project-ref SEU-PROJECT-REF
```

O `project-ref` está em Project Settings → General.

## 2. Rodar as migrações

```powershell
npx supabase db push
```

Aplica, em ordem, todas as de `supabase/migrations/`. Depois, no SQL Editor, confira:

```sql
select public.fundadores_vendidos();            -- deve devolver 0
select code, preco_referencia from public.products where code in ('fundador', 'anual');
```

Testes de privacidade da Licença Igreja (pgTAP):

```powershell
npx supabase test db
```

## 3. Preencher a configuração e sincronizar

- `config/produtos-plataforma.json`: mapeie os IDs reais dos produtos vendidos no lançamento. Inclua o Fundador de R$ 47, o anual de R$ 97 e os adicionais Mapa Impresso de R$ 14,90 e Família de R$ 27.
- `config/checkout.json`: `renovacaoFundador` (link ou cupom de renovação a R$ 47) e `renovacaoAnual` (renovação a R$ 97).
- Configure os dois adicionais no próprio checkout e teste se a plataforma informa a compra e o reembolso de cada item. Deixe o lote Fundador limitado também na plataforma. O contador no app não reserva uma vaga no momento em que o checkout é aberto.
- `content/oferta.json`: para testar o fechamento sem vender 500, ponha `"fundadorLimite": 1` só no projeto de teste e volte para 500 depois.

```powershell
npm run config:sync
```

## 4. Segredos das funções

```powershell
npx supabase secrets set HOTMART_HOTTOK=SEU_HOTTOK KIWIFY_TOKEN=SEU_TOKEN_KIWIFY
```

```powershell
npx supabase secrets set RESEND_API_KEY=SUA_CHAVE EMAIL_FROM="A Palavra em Ordem <ola@seudominio.com.br>"
```

Só se `config/checkout.json` estiver sem os links de renovação:

```powershell
npx supabase secrets set FUNDADOR_CHECKOUT_URL=https://... ANUAL_CHECKOUT_URL=https://...
```

E os do push (já existentes): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

## 5. Publicar as funções

```powershell
npx supabase functions deploy pagamento --no-verify-jwt
```

```powershell
npx supabase functions deploy renovacao-emails
```

```powershell
npx supabase functions deploy lembretes
```

## 6. Cadastrar o webhook na plataforma

- **Hotmart** (Ferramentas → Webhook/Postback 2.0): URL
  `https://SEU-PROJECT-REF.supabase.co/functions/v1/pagamento?plataforma=hotmart`
  Eventos: compra aprovada, completa, reembolsada, chargeback, cancelada, atrasada. O hottok de lá é o `HOTMART_HOTTOK`.
- **Kiwify**: URL `https://SEU-PROJECT-REF.supabase.co/functions/v1/pagamento?plataforma=kiwify`, com o token que vai em `KIWIFY_TOKEN`.

## 7. Simular uma venda de teste

Sem gastar dinheiro, mande um evento no mesmo formato da Hotmart (troque o id do produto pelo real do Fundador e o hottok):

```powershell
$body = @{ event = 'PURCHASE_APPROVED'; data = @{ product = @{ id = 'ID_DO_PRODUTO_FUNDADOR' }; buyer = @{ email = 'seu-email-de-teste@exemplo.com' }; purchase = @{ transaction = 'TESTE-0001'; approved_date = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() } } } | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri 'https://SEU-PROJECT-REF.supabase.co/functions/v1/pagamento?plataforma=hotmart' -Headers @{ 'X-HOTMART-HOTTOK' = 'SEU_HOTTOK' } -ContentType 'application/json' -Body $body
```

Confira no SQL Editor:

```sql
select product_code, status, preco_fundador, expires_at from public.entitlements where order_id = 'TESTE-0001';
select * from public.webhook_log order by created_at desc limit 5;
select public.fundadores_vendidos();            -- agora 1
```

**Fechamento automático** (com `fundadorLimite: 1`): mande o mesmo comando com outro e-mail e `transaction = 'TESTE-0002'`. Essa venda deve entrar com `preco_fundador = false` e aparecer em:

```sql
select * from public.fundador_excedentes;
```

Abra a LP com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` apontando para esse projeto: com 1 de 1 vendido, o bloco vira "Acesso anual · R$ 97". Para desfazer, mande o mesmo corpo com `event = 'PURCHASE_REFUNDED'` (a vaga volta).

Teste real de ponta a ponta: a Hotmart tem compra de teste no próprio painel (ou um cupom de 100% para você mesmo); o webhook chega igual.

## 8. Agendar os e-mails de renovação (uma vez por dia)

SQL Editor, com as extensões `pg_cron` e `pg_net` ligadas:

```sql
select cron.schedule('renovacao-emails', '0 12 * * *', $$
  select net.http_post(
    url := 'https://SEU-PROJECT-REF.supabase.co/functions/v1/renovacao-emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || 'SUA_SERVICE_ROLE_KEY'));
$$);
```

Teste agora, sem esperar: dê ao seu entitlement de teste um vencimento em 15 dias e chame a função na mão.

```sql
update public.entitlements set expires_at = now() + interval '14 days 23 hours' where order_id = 'TESTE-0001';
```

```powershell
Invoke-RestMethod -Method Post -Uri 'https://SEU-PROJECT-REF.supabase.co/functions/v1/renovacao-emails' -Headers @{ Authorization = 'Bearer SUA_SERVICE_ROLE_KEY' }
```

Deve responder `enviados: 1` e o e-mail chega. Chamar de novo responde `enviados: 0` (cada aviso sai uma vez, registrado em `renovacao_avisos`).

## 9. Conta dos compradores

- Authentication → URL Configuration: **Site URL** = domínio do app; em **Redirect URLs**, `https://SEU-DOMINIO/**` (e `http://localhost:5174/**` para testar local).
- Habilite o provedor **Email** e a confirmação de e-mail. Em **Email Templates**, use `supabase/templates/link-magico.html` em **Magic Link** e **Confirm signup**. Substitua `SEU-DOMINIO` pelo domínio do app na imagem e na condição do endereço de ativação. Use `supabase/templates/recuperar-senha.html` em **Reset password**.
- No provedor **Email**, habilite **Require current password when updating** para validar no servidor a senha atual informada no Perfil. A recuperação por e-mail usa a sessão do link para alterar a senha.
- Configure o envio pelo SMTP do projeto em **Authentication → SMTP Settings**. Com esses modelos, o comprador pode abrir o e-mail no dispositivo que preferir e confirmar o link no app.
- Configure o retorno do checkout para `https://SEU-DOMINIO/obrigado`. Após a compra de teste, abra essa tela em uma janela anônima, solicite o primeiro acesso com o e-mail do pagamento e defina a senha depois que o plano for localizado. Em outra janela anônima, entre em `/entrar` com essa senha e confira o plano no Perfil. Repita com **Esqueci minha senha** e confira o acesso com a nova senha.
- No **Perfil → Minha conta**, confira nome, e-mail e data de criação. Edite o nome, altere a senha e saia. Entre de novo com a nova senha e confirme o nome atualizado. O nome fica no cadastro de autenticação do usuário e o plano continua vindo da compra.
- Abra o app sem sessão e inicie a jornada gratuita. Confira que é possível entrar, concluir o primeiro dia e voltar ao mapa sem cadastro.

Para repetir a jornada de conta no Chromium com dados fictícios, rode `npm run test:account`. O teste sobe uma instância local em outra porta e simula a autenticação, a compra e a recuperação, sem enviar e-mails reais.

## 10. Variáveis do app e da LP (`.env.local` ou na hospedagem)

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_HOTMART_CHECKOUT_URL` (Fundador), `VITE_HOTMART_CHECKOUT_ANUAL_URL` (anual R$ 97), `VITE_VAPID_PUBLIC_KEY`, `VITE_META_PIXEL_ID`, `VITE_APP_URL`.

## 11. Na plataforma de pagamento (não é código)

- Garantia do produto: **30 dias**.
- Fundador e anual como **pagamento único** (sem recorrência).
- Order bumps desligados no checkout de Fundador (para reativar: `content/oferta.json` → `bumps.ativos` e ligar na plataforma).
