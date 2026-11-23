# 04 · Conta, dados e venda (Supabase + Hotmart)

Enquanto `.env.local` não tiver as chaves do Supabase, o app funciona 100% no aparelho e esconde
tudo de conta ("Salve sua jornada", seção Conta do Perfil). Nada quebra.

## Como os dados fluem

```
Aparelho (localStorage)  ──login──►  merge  ──►  Supabase: progress + diary_entries (RLS: só o dono)
        ▲                                              │
        └──────────── toda mudança sobe em ~1,5 s ◄────┘

Hotmart ──webhook──► Edge Function hotmart-webhook ──► subscriptions ──► is_founder() ──► Home / Perfil / Oferta
App ──track()──► events (só insert; leitura só no painel)
```

- **Primeiro login** (link mágico ou Google): o que estava no aparelho é mesclado com a conta
  (`src/game/merge.ts`): dias, símbolos, marcos e diário viram união; nada conquistado se perde.
- **Sair**: a conta continua salva; o aparelho mantém a cópia local.
- **Compra**: o link de checkout leva `xcod=<id da conta>` (quando logado) e `sck=app_<origem>`.
  O webhook liga a compra à conta pelo `xcod` ou, sem ele, pelo e-mail do comprador.
  Acesso Fundador vale 365 dias a partir da aprovação. Reembolso, chargeback, cancelamento e
  disputa revogam.

## 1. Criar o projeto no Supabase

1. supabase.com → New project (região São Paulo). Guarde a senha do banco.
2. Project Settings → API: copie **Project URL** e **anon public key** para `.env.local`
   (modelo em `.env.example`).
3. Aplique o esquema. Opção simples: SQL Editor → cole e rode
   `supabase/migrations/20261119000000_initial.sql`.
   Opção CLI:
   ```
   npx supabase init        # cria supabase/config.toml (mantém migrations e functions)
   npx supabase link --project-ref SEU_REF
   npx supabase db push
   ```

## 2. Login

Authentication → URL Configuration:
- **Site URL**: o endereço de produção.
- **Redirect URLs**: `http://localhost:5173/**`, `http://localhost:5174/**` e o de produção.

Link mágico (Authentication → Providers → Email): já vem ligado. Em Email Templates, troque o
texto do "Magic Link" para português, por exemplo: assunto "Seu link de acesso — A Palavra em Ordem".
Para produção, configure SMTP próprio (o envio padrão do Supabase tem limite baixo por hora).

Google (Authentication → Providers → Google):
1. Google Cloud Console → APIs e serviços → Credenciais → ID do cliente OAuth (Aplicativo da Web).
2. URI de redirecionamento autorizado: `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
3. Cole Client ID e Client Secret no Supabase e ative.

## 3. Hotmart

1. Crie o produto **Acesso Fundador** (R$ 47, acesso de 1 ano). Anote o **ID do produto**.
2. Copie o link de checkout para `VITE_HOTMART_CHECKOUT_URL` no `.env.local`.
3. Ferramentas → Webhook (API e notificações) → copie o **hottok**.
4. Publique a função:
   ```
   npx supabase secrets set HOTMART_HOTTOK=SEU_HOTTOK HOTMART_PRODUCT_ID=SEU_ID
   npx supabase functions deploy hotmart-webhook --no-verify-jwt
   ```
   (`--no-verify-jwt` porque quem chama é a Hotmart; a função confere o hottok.)
5. Na Hotmart, cadastre o webhook:
   - URL: `https://SEU-PROJETO.supabase.co/functions/v1/hotmart-webhook`
   - Versão: **2.0.0**
   - Eventos: Compra aprovada, Compra completa, Compra cancelada, Compra reembolsada,
     Chargeback, Disputa (protesto), Compra expirada.
6. Teste com o botão "Enviar teste" da Hotmart e confira a linha em `subscriptions`.

## 4. Analytics

Eventos de `docs/01-produto.md` vão para a tabela `events` (mais `sign_in_requested`, para o funil
de conta). Ninguém lê pela API; consulte no SQL Editor. Exemplos:

```sql
-- Funil do onboarding nos últimos 30 dias (aparelhos únicos)
select name, count(distinct anon_id)
  from events
 where created_at > now() - interval '30 days'
   and name in ('onboarding_start','diagnosis_answered','day_start','day_complete')
 group by name;

-- Atividades mais difíceis (acerto de primeira)
select props->>'card' as card, avg((props->>'acertou')::boolean::int) as acerto_primeira
  from events where name = 'activity_result'
 group by 1 order by 2;
```

Observações:
- `activity_result.acertou` = acertou de primeira; `tentativas` = quantas tentativas até acertar.
- `anon_id` é um id aleatório guardado no aparelho; une eventos de antes e depois do login.
- Inclua na política de privacidade (LGPD) que o app registra uso de forma pseudônima.
- A tabela aceita insert anônimo: se aparecer abuso, dá para limitar por taxa numa Edge Function.

---

## 5. Acessos por produto e pagamento (Hotmart e Kiwify) · docs/07, Prompt 1

Substitui a função `hotmart-webhook` e a tabela `subscriptions` (as compras antigas são copiadas
para a nova tabela pela migração).

```
Hotmart / Kiwify ──webhook──► Edge Function pagamento ──► entitlements ──► useAccess() no app
                                       │                       └──► can_access() no servidor
                                       └──► webhook_log (tudo o que chegou)
```

1. Rode no SQL Editor `supabase/migrations/20261121000000_entitlements.sql`
   (cria `products`, `entitlements`, `webhook_log`, `premium_lessons` e as funções de acesso).
2. Preencha os ids reais em `config/produtos-plataforma.json` (produto ou código de oferta → código
   do app) e rode `npm run config:sync`.
3. Segredos e publicação:
   ```
   npx supabase secrets set HOTMART_HOTTOK=SEU_HOTTOK KIWIFY_TOKEN=SEU_TOKEN
   npx supabase functions deploy pagamento --no-verify-jwt
   ```
4. URLs dos webhooks:
   - Hotmart (versão 2.0.0): `https://SEU-PROJETO.supabase.co/functions/v1/pagamento?plataforma=hotmart`.
     Eventos: compra aprovada, completa, cancelada, reembolsada, chargeback, disputa, expirada e
     cancelamento de assinatura.
   - Kiwify: `https://SEU-PROJETO.supabase.co/functions/v1/pagamento?plataforma=kiwify`, com o
     token da conta (a Kiwify assina o corpo e manda `?signature=`). Eventos: compra aprovada,
     reembolso, chargeback, recusada, assinatura renovada e assinatura cancelada.
5. Página de obrigado na plataforma: `https://SEU-APP/obrigado`.
6. Confira cada chamada em `webhook_log` (SQL Editor: `select * from webhook_log order by id desc`).

Regras: Fundador 365 dias; Mensal 31 dias, renovado a cada cobrança; Vitalício sem vencimento (e o
Fundador deixa de vencer); bumps sem vencimento, exceto Áudio, que acompanha o Fundador. Reembolso e
chargeback tiram o acesso na hora; cancelar o Mensal mantém o acesso até o fim do período pago.
Compra com e-mail sem conta fica pendente e é ligada quando a conta é criada com esse e-mail.
O link de checkout leva o id da conta (`xcod` na Hotmart, `s1` na Kiwify) para ligar a compra mesmo
com outro e-mail. As regras do app ficam em `src/access/rules.ts`; as do servidor, na função
`can_access` da migração. Mantenha as duas iguais.

Conteúdo pago (Trilha 2, A Bíblia em Ordem, estudos) não entra no pacote do app: fica em
`premium_lessons` e só é entregue a quem tem acesso (`src/access/premium.ts`).

Sem Supabase, no modo dev, o painel DEV tem "Simular pagamento": cada botão monta o payload real da
plataforma e passa pela mesma lógica do servidor (`supabase/functions/_shared/logic-access.ts`).

---

## 6. Mapa da Bíblia para imprimir (bump) · docs/07, Prompt 5

1. Gere os arquivos a partir do próprio app: `npm run print:export`. Ficam em `private/downloads/`
   (fora do `public/`, nunca publicados): `mapa-a3.pdf`, `mapa-a4.pdf`, `wallpaper-1.png`,
   `wallpaper-2.png`, `wallpaper-3.png`. As páginas que viram esses arquivos são `/print/mapa-a3`,
   `/print/mapa-a4` e `/print/wallpaper-1` a `-3` (textos em `content/impressao.json`).
2. Rode no SQL Editor `supabase/migrations/20261122000000_downloads.sql` (cria o bucket privado
   `downloads` e a regra: só quem tem `mapa-impresso` ativo lê os arquivos).
3. Envie os arquivos: no terminal, com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` definidos,
   `npm run print:upload`.
4. A página `/downloads` mostra os botões só para quem comprou. Cada toque pede um link assinado
   que vale 10 minutos. A `/obrigado` e o "Meu plano" levam até ela.

Antes de vender: conferir as citações dos papéis de parede (Salmo 119:105 e Apocalipse 21:4) na
tradução que o app adotar.

---

## 7. Acesso Família (bump) · docs/07, Prompt 6

1. Rode no SQL Editor `supabase/migrations/20261123000000_family.sql`.
2. Como funciona:
   - Quem comprou o bump `familia` vê "Minha família" no Perfil, com 2 vagas. "Convidar" gera um
     link `/convite/<código>` e abre o WhatsApp com a mensagem pronta.
   - Quem aceita cria a conta (ou entra) e recebe o mesmo acesso do dono. Esse acesso não tem data
     própria: acompanha o do dono. Renovou, vira vitalício ou é reembolsado, os convidados vão junto.
   - O dono pode remover alguém e convidar outra pessoa no máximo 2 vezes em 365 dias. Cancelar um
     convite que ninguém aceitou não conta.
   - Progresso, lâmpada e diário de cada um são privados. A família vê só o primeiro nome e os dias
     de lâmpada acesa de quem deixou ligado "Mostrar minha lâmpada para a família" (ligado por padrão).
3. As regras ficam nas funções do banco (`create_family_invite`, `accept_family_invite`,
   `revoke_family_invite`, `my_family`, `set_family_lamp_share`) e, espelhadas para os testes e o
   simulador, em `supabase/functions/_shared/logic-family.ts`.
4. No dev sem Supabase: painel DEV → Simular pagamento → "Bump: Acesso Família" e
   "Família: simular aceite do convite".

---

## 8. Modo Áudio (bump, fase 2) · docs/07, Prompt 8

1. Roteiro falado de cada lição, para revisar e aprovar antes de gravar:
   `npm run audio:generate -- <trilha> <dias>` (ex.: `-- mapa-7-dias 1-7`). Gera
   `private/audio/lessons/<trilha>/dia-XX.roteiro.txt`. As frases de ligação estão em
   `content/audio-licao.json`; o resto é o texto dos próprios cards (sem o texto bíblico).
2. Depois de aprovado, gerar o áudio: defina o serviço de voz no terminal e rode com `--audio`.
   - ElevenLabs (padrão): `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (voz principal do
     docs/05) e, opcional, `ELEVENLABS_VOICE_ID_ORACAO` (voz das orações).
   - Outro serviço: um adaptador novo em `scripts/audio/adapters.mjs` e `AUDIO_TTS_PROVIDER=<nome>`.
   - O arquivo sai no padrão do docs/05: MP3 mono, 44,1 kHz, 128 kbps, −16 LUFS, 0,3 s de silêncio.
3. Rode no SQL Editor `supabase/migrations/20261125000000_lesson_audio.sql` (bucket privado
   `lesson-audio`, só para quem tem o bump `audio`) e envie: `npm run audio:upload`.
4. No app, quem tem o Modo Áudio vê "Ouvir a lição" no topo de cada lição: tocar, pausar, voltar
   10 s e velocidade 1x, 1,25x e 1,5x, com controle pela tela bloqueada. Ouvir até o fim conclui a lição.

## 9. Estudos por livro (docs/07, Prompt 9)

- **Onde aparece:** "Estudos por livro" na Home e no Perfil abre a Loja de estudos (também em `/estudos`). Cada estudo mostra capa, descrição, número de lições e preço. Para quem tem Acesso Fundador o preço aparece 30% menor (R$ 25,90 em vez de R$ 37) com o selo "Preço de Fundador".
- **Conteúdo:** cada estudo é uma trilha em `content/trilhas/estudo-<nome>/` com as lições em rascunho. Mesma linha de produção das outras trilhas: `content:check`, `content:review`, `content:publish` e `content:upload -- estudo-<nome>`.
- **Apocalipse:** `estudo-apocalipse/trilha.json` tem `revisao_pastoral: false`. Enquanto não for `true`, `content:check`, `content:publish` e `content:upload` recusam qualquer lição publicada desse estudo.
- **Venda:** em cada plataforma, um produto por estudo e, nele, uma segunda oferta com 30% de desconto para Fundadores. Coloque os ids em `config/produtos-plataforma.json` (as duas ofertas apontam para o mesmo estudo) e rode `npm run config:sync`. Os links vão em `config/checkout.json`, em `estudos`: `checkout` (preço cheio) e `checkoutFundador` (com desconto). Sem link, o botão Comprar avisa que o estudo ainda não está à venda.
- **Acesso:** chega pelo webhook de pagamento, sem vencimento, e libera só aquele estudo. Reembolso e chargeback revogam.
- **Capas:** `capa-estudo-romanos`, `capa-estudo-salmos` e `capa-estudo-apocalipse` estão no `content/midia.json` como pendentes, com prompt.

## 10. Licença Igreja (docs/07, Prompt 10)

- **Produtos:** `igreja` (até 30 pessoas, R$ 297/ano) e `igreja-100` (até 100 pessoas, R$ 697/ano). Coloque os ids das plataformas em `config/produtos-plataforma.json` e rode `npm run config:sync`.
- **Banco:** rode a migração `20261126000000_church_groups.sql`. A compra cria o grupo sozinha (um gatilho na tabela de acessos), com quem comprou como líder; renovação, reembolso e vencimento valem para o grupo. A função de pagamento não muda.
- **Convite:** o líder abre o painel (Home → cartão "Painel do grupo", ou `/grupo`) e manda o link `/igreja/<código>` pelo WhatsApp. Quem entra ganha o acesso completo enquanto a licença estiver ativa e houver vaga. O líder pode gerar um novo link (o antigo para de funcionar) e tirar alguém do grupo (a vaga volta).
- **Painel:** quantos leram hoje, a média de dias de lâmpada, quantas pessoas estão em cada dia da jornada, a lista com primeiro nome, onde cada um está e a lâmpada, e a pergunta da semana (a reflexão da lição em que a maior parte do grupo está).
- **Membro:** na Home, "Você está lendo com [grupo]" e a lâmpada coletiva (lâmpadas acesas hoje de todo o grupo).
- **Privacidade:** o líder só recebe primeiro nome e progresso. Diário, reflexões, respostas, e-mail e id da conta nunca saem do banco para ele; isso é garantido por RLS e pelas funções da migração, não pelo app. Provas: `supabase/tests/church_group_privacy.test.sql` (rode com `supabase test db`) e `supabase/functions/_shared/church-privacy.test.ts` (roda no `npm test`).
- **Simulador (dev):** Simular pagamento → "Licença Igreja (30/100 vagas)", "Igreja: alguém entra no meu grupo" e "Igreja: eu entro num grupo".

## 11. Retenção e métricas (docs/07, Prompt 11)

### Mensagens
No horário que a pessoa escolheu no Perfil, no máximo uma por dia:
- **Domingo:** "Sua semana na Palavra": dias lidos na semana, as lições por onde passou e o próximo marco.
- **3 dias sem abrir:** "A jornada espera por você. Você parou em Dia X: título. Leva 5 minutos." Se a pessoa tiver Graça, a mensagem avisa que a Graça protegeu a lâmpada. Vai uma vez por ausência.
- **Nos outros dias, se a lição de hoje não foi feita:** "Sua lâmpada está esperando. Dia X: título."

As regras ficam em `supabase/functions/_shared/logic-reminders.ts` (com testes). O app monta o estado a cada abertura e a mensagem chega por três caminhos, sem repetir no mesmo dia:
1. **Push do servidor** (funciona com o app fechado, no Android e no iPhone com o app na tela inicial):
   - Gere as chaves VAPID uma vez: `npx web-push generate-vapid-keys`.
   - No `.env.local` do app: `VITE_VAPID_PUBLIC_KEY=<chave pública>`.
   - Na função: `npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:seu-email`.
   - Rode a migração `20261127000000_reminders.sql` e publique: `npx supabase functions deploy lembretes`.
   - Agende a cada 15 minutos (SQL Editor, com as extensões pg_cron e pg_net ligadas):
     ```sql
     select cron.schedule('lembretes', '*/15 * * * *', $$
       select net.http_post(
         url := 'https://SEU-PROJETO.supabase.co/functions/v1/lembretes',
         headers := jsonb_build_object('Authorization', 'Bearer ' || 'SUA_SERVICE_ROLE_KEY'));
     $$);
     ```
2. **Sincronização periódica** (app instalado no Android, sem servidor): `public/reminder-sw.js`.
3. **Timer** enquanto o app está aberto.

### Painel interno (/admin)
- Rode a migração `20261128000000_admin_metrics.sql` e cadastre seu e-mail no SQL Editor: `insert into public.admins (email) values ('seu-email@exemplo.com');`
- Abra `/admin` e entre com esse e-mail. Para qualquer outra conta, o banco recusa os números.
- **Funil:** visitantes da landing page → começaram no app → concluíram o Dia 1 → voltaram no Dia 2 → chegaram ao Dia 7 (pessoas distintas, com a % de cada etapa).
- **Vendas:** por produto, com a receita pelo preço de referência; aceite de cada bump e do upsell sobre os compradores do Acesso Fundador; reembolsos e renovações.
- **Filtros:** período (7, 30 ou 90 dias, ou datas) e UTM.
  - A campanha de cada pessoa é a do primeiro acesso: a landing page passa os utm_* para o app, e todo evento leva esse dado.
  - As vendas só podem ser filtradas por utm_source: as plataformas devolvem apenas o `src`, que a landing page preenche com o utm_source no link de checkout.
- A landing page agora grava `lp_view` e `lp_click` na mesma tabela de eventos (só com o Supabase configurado no `.env`).
