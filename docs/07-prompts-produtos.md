# 07 · Prompts para o Claude Code configurar os produtos

Salve como `docs/07-prompts-produtos.md`. Rode um prompt por vez, nesta ordem, e só passe ao próximo quando o anterior estiver funcionando.

Para cada um, diga ao Claude Code:
```
Leia o CLAUDE.md, o docs/06-produtos-e-esteira.md e execute o Prompt N do docs/07-prompts-produtos.md.
```

---

## Prompt 1 · Acessos e pagamento (base de tudo)

```
Objetivo: o app saber o que cada pessoa comprou e liberar só o que ela tem direito.

1. Supabase (se ainda não estiver configurado, configure agora, conforme o Sprint 4):
   - Tabela products: code (free, fundador, mapa-impresso, familia, vitalicio, audio, mensal, estudo-romanos, estudo-salmos, estudo-apocalipse, igreja), nome, tipo, preço de referência.
   - Tabela entitlements: user_id, product_code, origem (compra, convite_familia, igreja, cortesia), status (ativo, cancelado, reembolsado, expirado), starts_at, expires_at (null = vitalício), order_id da plataforma, grupo_id (opcional).
   - RLS: cada usuário lê só os próprios entitlements. Escrita só pelo servidor.
2. Webhook numa Edge Function (/webhooks/pagamento):
   - Aceite Hotmart e Kiwify, com validação do token/assinatura de cada uma. As chaves ficam em variáveis de ambiente.
   - Mapeie o id do produto e da oferta na plataforma para o product_code, num arquivo config/produtos-plataforma.json, para eu preencher os ids reais sem mexer no código.
   - Compra aprovada: cria o entitlement (fundador = 365 dias; mensal = 31 dias e renova a cada cobrança; vitalicio = sem vencimento e substitui o fundador; bumps = sem vencimento, exceto audio, que segue o vencimento do fundador).
   - Reembolso ou chargeback: status reembolsado e acesso removido na hora.
   - Cancelamento do mensal: mantém o acesso até o fim do período pago.
   - Se o e-mail da compra ainda não tem conta, guarde como pendente e associe quando a pessoa criar a conta com esse e-mail.
   - Registre todo evento recebido numa tabela webhook_log, para eu conferir.
3. No app: hook useAccess() que responde perguntas como podeAcessar("trilha-jesus-em-ordem"). Regras num único arquivo src/access/rules.ts:
   - trilha-mapa-7-dias: todos
   - trilha-jesus-em-ordem e biblia-em-ordem: fundador, vitalicio, mensal, igreja (ativos)
   - download-mapa-impresso: mapa-impresso
   - modo-audio-completo: audio
   - estudo-X: estudo-X, com desconto para quem é Fundador
4. Paywall: um card bloqueado com cadeado abre a folha de Oferta. O conteúdo bloqueado nunca chega ao navegador de quem não tem acesso (o servidor filtra).
5. No Perfil: "Meu plano" com o que a pessoa tem, a data de vencimento e o selo "Fundador" ou "Fundador Vitalício".
6. Página /obrigado: depois da compra, detecta os produtos comprados e mostra o próximo passo de cada um (entrar no app, baixar o mapa, convidar a família).
7. Testes: simule no dev um webhook de cada tipo (compra, bump, upsell, reembolso, renovação e cancelamento do mensal) e me mostre o acesso mudando.
```

## Prompt 2 · Linha de produção de conteúdo

```
Objetivo: produzir lições em lotes sem quebrar o app e sem publicar nada sem revisão.

1. Cada lição ganha o campo status: rascunho, em_revisao ou publicado. O app mostra só "publicado". No modo dev, mostra todos, com uma faixa indicando o status.
2. Estrutura de pastas: content/trilhas/<id-da-trilha>/dia-XX.json, uma lição por arquivo, mais um trilha.json com título, descrição, símbolos e a ordem dos dias.
3. Migre a Trilha 1 para essa estrutura, sem mudar nenhum texto.
4. Crie um validador (npm run content:check) que confere: tipos de card válidos, ids de mídia existentes no midia.json, limite de cerca de 70 palavras por card, quiz com exatamente uma correta, referência bíblica em todo card "palavra" e nenhum card com texto vazio.
5. Crie um comando de revisão (npm run content:review -- <trilha> <dias>) que gera um documento em Markdown legível com as lições daquele lote, no mesmo formato do roteiro dos 7 dias, para eu mandar ao pastor.
6. Crie um comando de publicação (npm run content:publish -- <trilha> <dias>) que muda o status para publicado só se o content:check passar.
```

## Prompt 3 · Trilha 2 "Jesus em Ordem"

```
Objetivo: a Trilha 2 aparecendo no app, com os 30 dias estruturados.

1. Crie content/trilhas/jesus-em-ordem/ com o trilha.json e 30 arquivos dia-XX.json, com título e passagens do roteiro em docs/06-produtos-e-esteira.md, todos com status "rascunho" e cards vazios.
2. Na Home: quando o usuário termina o Mapa de 7 dias e tem acesso, a Trilha 2 aparece como continuação do caminho (novo trecho do mapa ilustrado, com a capa capa-jesus-em-ordem). Sem acesso, aparece bloqueada com a Oferta.
3. Atividade nova "linha do tempo da vida de Jesus": uma faixa horizontal com marcos que se acendem conforme os dias são concluídos (nascimento, batismo, ministério, cruz, ressurreição). Componente reutilizável em src/activities/.
4. Desbloqueio: um dia por dia de calendário, como na Trilha 1. Quem é Fundador e terminou a Trilha 1 começa a Trilha 2 no dia seguinte.
5. Não escreva o texto das lições: elas serão escritas e revisadas fora daqui e colocadas nos arquivos.
```

## Prompt 4 · Formato "Leitura guiada" e A Bíblia em Ordem

```
Objetivo: o formato leve para o plano cronológico e a Etapa 1.

1. Novo tipo de lição "leitura-guiada" com estes cards, nesta ordem: leitura (referência + botão "Ler na minha Bíblia" + "Marcar como lido"), contexto ("onde isso se encaixa"), observar ("o que observar"), cristo ("como aponta para Cristo") e pergunta (uma pergunta que vai para o diário).
2. Crie content/trilhas/biblia-em-ordem/etapa-01/ com os 30 dias da Etapa 1 "Origens" do docs/06, status "rascunho".
3. Tela própria da Bíblia em Ordem: uma grade de etapas (Etapa 1 aberta, as próximas com "em breve" e a data prevista), o progresso em capítulos lidos e um mini mapa mostrando em que livro e era a pessoa está.
4. "Marcar como lido" conta para a lâmpada acesa, igual a concluir uma lição.
5. Quando uma etapa nova é publicada, todos os Fundadores recebem uma notificação: "Nova etapa liberada: [nome]".
```

## Prompt 5 · Mapa para imprimir (bump R$ 14,90)

```
Objetivo: gerar os arquivos do bump a partir do próprio app.

1. Crie uma rota de impressão /print/mapa-a3 com o pôster: título "A Bíblia em Ordem", as 7 eras em faixas (com os fundos de era em baixa opacidade), as 7 medalhas, os 66 livros posicionados na era em que se encaixam (use livros.json e diasDoMapa) e uma linha do tempo com os marcos dos 7 dias. Tipografia do app, margens de impressão de 10 mm.
2. Rota /print/mapa-a4, com o mesmo conteúdo compactado.
3. Três rotas /print/wallpaper-1, -2 e -3 em 1080×1920: o mapa, a lâmpada com Salmo 119:105 e a cidade com Apocalipse 21:4 (texto curto, conferido na tradução do app).
4. Script npm run print:export que usa Playwright para gerar os PDFs (A3 e A4) e os PNGs, e salva em private/downloads/ (fora do public).
5. Página /downloads, protegida: só quem tem o entitlement mapa-impresso vê os botões. Os arquivos são servidos por link assinado do Supabase Storage, com validade de 10 minutos.
6. Me mostre o PDF A3 gerado antes de seguir.
```

## Prompt 6 · Acesso Família (bump R$ 27)

```
Objetivo: o comprador convidar até 2 pessoas.

1. Tabela family_invites: owner_id, código, e-mail opcional, status (pendente, aceito, revogado), aceito_por.
2. Quem tem o entitlement familia vê, no Perfil, "Minha família" com 2 vagas, cada uma com botão "Convidar" que gera um link e uma mensagem pronta para WhatsApp: "Estou lendo a Bíblia inteira em ordem e quero que você venha comigo. Entre por este link: ..."
3. Quem aceita cria a conta e recebe um entitlement com origem convite_familia e o mesmo vencimento do dono.
4. Progresso, lâmpada e diário de cada um são privados. Opcional (ligado por padrão, com opção de desligar): mostrar ao grupo familiar só a lâmpada de cada um ("Ana está com 5 dias de lâmpada acesa").
5. O dono pode revogar uma vaga e convidar outra pessoa (no máximo 2 trocas por ano).
6. Se o dono for reembolsado, os convidados perdem o acesso junto.
```

## Prompt 7 · Vitalício e Mensal

```
1. Vitalício: quando chega a compra de vitalicio, o entitlement fundador vira sem vencimento. No Perfil, o selo muda para "Fundador Vitalício", com um brilho dourado. Os convites da família passam a ser vitalícios também.
2. Mensal: o entitlement vence em 31 dias e é renovado a cada webhook de cobrança aprovada. Se a cobrança falhar, dê 3 dias de tolerância, com um aviso discreto no app, antes de bloquear.
3. Para quem está no mensal há 2 meses ou mais: mostre uma vez, no Perfil, a oferta de trocar pelo anual ("Pague R$ 47 pelo ano e economize").
4. Para quem tem o fundador e faltam 30 dias para vencer: aviso de renovação no app e o link do checkout da renovação (preencha em config).
```

## Prompt 8 · Modo Áudio (fase 2)

```
Objetivo: narração completa das lições e um player para ouvir sem olhar a tela.

1. Script npm run audio:generate -- <trilha> <dias> que monta o roteiro falado de cada lição a partir dos cards (abertura, entenda, a passagem em forma de resumo, como aponta para Cristo, reflexão e oração), gera o áudio com o serviço de voz configurado em variáveis de ambiente (deixe um adaptador para trocar de serviço) e salva em private/audio/lessons/. Use a voz e a especificação do docs/05-narracoes.md.
2. Antes de gerar, salve o roteiro falado em texto e me mostre um exemplo para eu aprovar.
3. Player de lição em modo áudio: botão "Ouvir a lição" no topo de cada lição para quem tem o entitlement audio, com tocar, pausar, voltar 10 s e velocidade 1x, 1,25x e 1,5x. Use a Media Session API para controlar pela tela bloqueada. Ouvir até o fim conclui a lição.
4. Áudios servidos por link assinado, só para quem tem acesso.
```

## Prompt 9 · Estudos por livro (fase 3)

```
1. Uma "Loja de estudos" dentro do app, com os 3 estudos do docs/06 (capa, descrição, número de lições e preço). Para Fundadores, mostre o preço com 30% de desconto e o selo "Preço de Fundador".
2. Cada estudo é uma trilha em content/trilhas/estudo-<nome>/ com as lições em "rascunho", seguindo a Linha de produção do Prompt 2.
3. O botão de compra leva ao checkout do produto correspondente (links em config), e o acesso chega pelo webhook do Prompt 1.
4. O estudo-apocalipse fica bloqueado para publicação até eu marcar revisao_pastoral: true no trilha.json.
```

## Prompt 10 · Licença Igreja (fase 3)

```
Objetivo: um líder comprar para o grupo e acompanhar sem invadir a privacidade de ninguém.

1. Tabelas: groups (nome, líder, limite de vagas, vencimento) e group_members (grupo, usuário, papel: lider ou membro).
2. Compra do produto igreja: cria o grupo e dá ao comprador o papel de líder. Faixas de vagas pelo produto comprado (30 ou 100).
3. O líder gera um link de convite. Quem entra ganha entitlement com origem igreja enquanto o grupo estiver ativo e houver vaga.
4. Painel do líder (/grupo): quantos concluíram a lição de hoje, sequência média, distribuição por dia da trilha e uma "pergunta da semana" sugerida a partir das lições que o grupo fez.
5. Privacidade, inegociável e garantida por RLS: o líder nunca acessa diário, reflexões, respostas de quiz ou dados pessoais além do nome. Escreva um teste que prove isso.
6. Na tela inicial do membro: "Você está lendo com [nome do grupo]" e a lâmpada coletiva do grupo.
```

## Prompt 11 · Retenção e métricas

```
1. Lembrete diário (notificação) no horário que a pessoa escolheu: "Sua lâmpada está esperando. Dia X: [título]."
2. Quem passa 3 dias sem abrir recebe uma mensagem: "A jornada espera por você. Você parou em [lição]. Leva 5 minutos." Se tiver Graça disponível, avise que ela protegeu a lâmpada.
3. Resumo semanal no domingo: dias lidos, personagens e eventos vistos e o próximo marco.
4. Painel interno (/admin, só para o meu e-mail): visitantes da landing page, leads, quem concluiu o dia 1, voltou no dia 2 e chegou ao dia 7, vendas por produto, taxa de aceite de cada bump e do upsell, reembolsos e renovações. Com filtro por período e por UTM.
```

---

## O que precisa ser escrito fora do Claude Code

O Claude Code monta a estrutura, mas o texto das lições é escrito e revisado à parte, como fizemos com os 7 dias, e depois colocado nos arquivos. Ordem sugerida:

1. Jesus em Ordem, dias 1 a 10 (para o lançamento)
2. A Bíblia em Ordem, Etapa 1, dias 1 a 15
3. Jesus em Ordem, dias 11 a 30, em lotes de 10
4. A Bíblia em Ordem, Etapa 1, dias 16 a 30
5. Os estudos por livro, só depois do lançamento
