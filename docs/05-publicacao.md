# 05 · Publicação (versão de teste e produção)

O app é estático (Vite + PWA): qualquer hospedagem com HTTPS serve. HTTPS é obrigatório para
instalar o PWA, funcionar offline e mostrar notificações no celular — por isso o teste pelo endereço
da rede local (`http://192.168.x.x:5174`) não instala nem lembra.

Arquivos já prontos no projeto:
- `vercel.json` — Vercel (rotas da SPA e cache).
- `public/_redirects` e `public/_headers` — Netlify e Cloudflare Pages.

Em todas: o service worker (`sw.js`, `reminder-sw.js`) vai sem cache, para cada versão nova chegar
logo; os arquivos de `assets/` têm nome com hash e cache de 1 ano.

## Passo a passo (Vercel, o mais simples)

1. Suba o projeto para um repositório no GitHub (depois do primeiro commit).
2. vercel.com → Add New → Project → importe o repositório. Framework: Vite (detectado).
3. Environment Variables (só quando o Supabase e a Hotmart estiverem prontos — ver `docs/04`):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_HOTMART_CHECKOUT_URL`.
   Sem elas o app funciona inteiro no aparelho, só sem conta e sem venda.
4. Deploy. Cada push gera uma URL de preview; a branch principal vira produção.
5. No Supabase (Authentication → URL Configuration), adicione a URL do Vercel em Site URL e Redirect URLs.

Netlify e Cloudflare Pages: comando de build `npm run build`, pasta `dist`. O resto vem dos arquivos acima.

## Antes de abrir para o público

- [ ] `npm test` e `npm run test:e2e` passando.
- [ ] `npm run check:media` sem itens faltando nem acima do peso.
- [ ] Testar no iPhone (Safari → Adicionar à Tela de Início) e no Android (instalar pelo Chrome).
- [ ] Política de privacidade (LGPD): conta, diário e eventos de uso pseudônimos (`docs/04`).
- [ ] Painel de dev: só aparece em `npm run dev`; o build de produção não inclui.
