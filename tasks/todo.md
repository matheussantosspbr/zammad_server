# Tasks: Prisma + Better Auth (Google/Discord) com aprovação manual

Plano: [tasks/plan.md](plan.md) · Spec: [specs/001-prisma-better-auth.md](../specs/001-prisma-better-auth.md)

## Phase 1: Fundação

- [x] Task 1: Instalar dependências
  - Acceptance: `prisma`, `@prisma/client`, `better-auth` em `dependencies`
  - Verify: `npm install` sem erro; `node_modules/better-auth` existe
  - Dependencies: None
  - Files: `package.json`, `package-lock.json`
  - Scope: XS
  - **Nota:** `@better-auth/cli` (devDependency planejada) está deprecada — o `better-auth@1.7.1` já traz CLI própria (`npx better-auth generate`). Não foi instalada.
  - **Decisão adicional (fora do escopo original da task, aprovada por você):** `better-auth@1.7.1` é ESM-only, incompatível com `"type": "commonjs"`. Projeto migrado para `"type": "module"`; 3 imports relativos em `server.ts` ganharam extensão `.js`. `npx tsc --noEmit` e `npm run dev` confirmados OK.

- [x] Task 2: Env vars + `.env.example`
  - Acceptance: `env.ts` valida `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `OWNER_EMAIL`; `.env.example` documenta todas com valor vazio
  - Verify: rodar `npm run dev` sem essas vars no `.env` produz erro claro do zod listando o que falta — **confirmado**, todas as 8 vars listadas no erro
  - Dependencies: None
  - Files: `src/core/config/env.ts`, `.env.example`
  - Scope: S

- [x] Task 3: Prisma init + schema Better Auth + `UserStatus` + migration
  - Acceptance: `prisma/schema.prisma` criado com datasource Postgres; `User`/`Session`/`Account`/`Verification` presentes; `UserStatus` (`PENDING`/`APPROVED`/`BLOCKED`, default `PENDING`) adicionado ao `User`; migration aplicada
  - Verify: `npx prisma migrate dev --name init` e `npx prisma generate` sem erro — **confirmado**, migration `20260821132414_init` aplicada no Neon (`neondb`)
  - Dependencies: Task 1, Task 2 (precisou de `DATABASE_URL` real no `.env`) — **você forneceu**
  - Files: `prisma/schema.prisma`, `prisma/migrations/**`, `prisma.config.ts` (novo), `package.json`
  - Scope: M
  - **Desvios do plano original (avaliados e aplicados sem bloquear, explico no resumo para você):**
    1. `@better-auth/cli` está sinalizado no npm como "deprecated — no longer supported, contact support" em todas as versões (inclusive betas), e o `better-auth@1.7.1` core não embute CLI. Em vez de instalar um pacote sinalizado dessa forma, escrevi `prisma/schema.prisma` manualmente com o schema padrão documentado do Better Auth (`User`, `Session`, `Account`, `Verification`) — é exatamente o que a CLI geraria.
    2. Prisma 7 mudou a arquitetura: `datasource.url` não é mais aceito em `schema.prisma`; migrations e o client agora usam **driver adapters** configurados via `prisma.config.ts` + adapter na instância do `PrismaClient`. Instalei `@prisma/adapter-pg`, `pg`, `dotenv` (dependencies) e `@types/pg` (devDependency), criei `prisma.config.ts` na raiz. Confirmado via docs oficiais da Prisma (não assumido de memória).

### Checkpoint: Fundação
- [ ] `prisma migrate dev` e `prisma generate` OK
- [ ] Tabelas corretas no banco
- [ ] `env.ts` falha com mensagem clara se faltar var
- [ ] Revisão com você antes de prosseguir

## Phase 2: Núcleo de autenticação

- [x] Task 4: Prisma client singleton
  - Acceptance: `src/infra/libs/prisma.ts` exporta uma instância única de `PrismaClient`, instanciado com `PrismaPg` (`@prisma/adapter-pg`) apontando para `env.DATABASE_URL` (arquitetura de driver adapters do Prisma 7)
  - Verify: `npx tsc --noEmit` sem erro — **confirmado**; query real (`prisma.user.findMany()`) contra o Neon — **confirmado, `users: 0`** (script de teste descartável, removido depois)
  - Dependencies: Task 3
  - Files: `src/infra/libs/prisma.ts`
  - Scope: XS
  - Dependencies: Task 3
  - Files: `src/infra/libs/prisma.ts`
  - Scope: XS

- [x] Task 5: Instância Better Auth
  - Acceptance: `src/infra/libs/auth.ts` exporta `auth` configurado com `prismaAdapter(prisma, { provider: "postgresql" })`, `socialProviders: { google, discord }` lendo client id/secret do `env`, e `databaseHooks.session.create.before` bloqueando quando `user.status !== "APPROVED"`
  - Verify: `npx tsc --noEmit` sem erro — **confirmado**. Nomes reais conferidos em `node_modules/@better-auth/core` e `node_modules/better-auth/dist` (não assumidos de memória)
  - Dependencies: Task 4
  - Files: `src/infra/libs/auth.ts`, `package.json` (`@better-auth/prisma-adapter` adicionada explicitamente)
  - Scope: M
  - **Ajuste em relação ao plano:** em vez de `APIError`, o hook retorna `false` (API documentada do próprio better-auth para `session.create.before` — mais simples e é o mecanismo que a doc oficial recomenda para exatamente este caso de "aprovação manual").

- [x] Task 6: Montar `/api/auth/*`
  - Acceptance: todas as rotas do Better Auth (sign-in, callback, sign-out, session, etc.) respondem sob `/api/auth/*`
  - Verify: servidor rodando com credenciais de teste — `GET /api/auth/get-session` retornou `200 null` (sem sessão); `POST /api/auth/sign-in/social` com `provider: google` e `provider: discord` retornaram URLs de autorização corretas (`redirect_uri` batendo com o documentado no `.env.example`). Discord usou o client_id real que você já tinha configurado.
  - Dependencies: Task 5
  - Files: `src/presentation/routes/auth.ts`, `src/presentation/routes/routes.ts`
  - Scope: S
  - **Ajuste em relação ao plano:** não usei `toNodeHandler` (abordagem que eu tinha em mente inicialmente) porque o parser de body padrão do Fastify já consome o stream da request antes do handler, o que quebraria esse helper. Segui o padrão oficial da documentação do Better Auth para Fastify (reconstruir um `Request` a partir de `request.body` já parseado).

### Checkpoint: Núcleo de autenticação
- [x] `npm run dev` sobe sem erro
- [x] Roteamento e geração de URL de OAuth confirmados (Google e Discord) com credenciais de teste
- [ ] **Ainda pendente (só você pode fazer):** completar o login de verdade num navegador (clicar "Entrar com Google/Discord", autorizar) para confirmar que o `User` é criado com `status = PENDING` e que nenhuma sessão válida é emitida. Isso exige uma volta de navegador real que eu não consigo simular aqui.

## Phase 3: Aprovação administrativa

- [x] Task 7: Middleware `requireOwner`
  - Acceptance: `preHandler` que resolve a sessão do Better Auth a partir do request e retorna `401` sem sessão, `403` se `session.user.email !== env.OWNER_EMAIL`
  - Verify: `npx tsc --noEmit` OK; request real sem cookie de sessão → **confirmado 401** nas 3 rotas administrativas
  - Dependencies: Task 5
  - Files: `src/presentation/middlewares/require-owner.ts`
  - Scope: S
  - **Pendente de verificação manual:** o caso "403 com sessão de usuário que não é o owner" só dá pra confirmar depois de um login real (Task 6 checkpoint pendente)

- [x] Task 8: Rotas administrativas
  - Acceptance: `GET /admin/users/pending` lista `status = PENDING`; `POST /admin/users/:id/approve` seta `APPROVED`; `POST /admin/users/:id/block` seta `BLOCKED`; todas usam `requireOwner`
  - Verify: `npx tsc --noEmit` OK; as 3 rotas testadas sem sessão retornam 401 (confirmado)
  - Dependencies: Task 4, Task 7
  - Files: `src/presentation/routes/admin-users.ts`, `src/presentation/routes/routes.ts`
  - Scope: M
  - **Pendente de verificação manual:** fluxo completo (listar → aprovar → login funciona → bloquear → login falha) depende de um login real seu

- [x] Task 8b: Refatoração para arquitetura em camadas (pedido seu, após a Task 8)
  - Acceptance: fluxo `rota -> factory -> controller -> schema (zod) -> use-case -> repository`; `/core` só com interfaces (`IUserRepository`, `IListPendingUsersUseCase`, `IApproveUserUseCase`, `IBlockUserUseCase`); `/infra` com as implementações (`PrismaUserRepository`, `ListPendingUsersUseCase`, `ApproveUserUseCase`, `BlockUserUseCase`, e as 3 factories); controllers e schema zod em `/presentation`
  - Decisões confirmadas com você: controllers/schemas em `/presentation`; use-cases implementados em `/infra`; factories em `/infra/factories`; escopo só admin-users (rota de auth/proxy do Better Auth ficou como estava)
  - Verify: `npx tsc --noEmit` OK; `npx biome check` limpo nos arquivos novos; testei a cadeia inteira contra o Neon real com um usuário descartável (criado e removido pelo script de teste) — criar → aparece em `findByStatus(PENDING)` → approve muda status e some da lista de pendentes → block muda status → schema zod rejeita `params` sem `id` com 400. Rotas seguem retornando 401 sem sessão de owner (comportamento do `requireOwner`, inalterado)
  - Dependencies: Task 8
  - Files: `src/core/repositories/user-repository.ts`, `src/core/use-cases/{list-pending-users,approve-user,block-user}.ts`, `src/infra/repositories/prisma-user-repository.ts`, `src/infra/use-cases/{list-pending-users,approve-user,block-user}.ts`, `src/infra/factories/make-{list-pending-users,approve-user,block-user}-controller.ts`, `src/presentation/protocols/controller.ts`, `src/presentation/schemas/admin-users-schema.ts`, `src/presentation/controllers/{list-pending-users,approve-user,block-user}-controller.ts`, `src/presentation/adapters/fastify-route-adapter.ts`, `src/presentation/routes/admin-users.ts`
  - Scope: L (11 arquivos novos + 1 reescrito, mas cada arquivo é pequeno e de responsabilidade única)

### Checkpoint: Fluxo completo
- [ ] Todos os 7 critérios de sucesso da spec conferidos manualmente — **pendente, depende de login real seu**
- [x] Rotas administrativas retornam `401`/`403` sem sessão de owner válida (confirmado o caso 401; 403 fica pendente do login real)

## Phase 4: Polimento

- [x] Task 9: Script `build`
  - Acceptance: `"build": "tsc"` em `package.json`
  - Verify: `npm run build` gera `dist/` sem erro — **confirmado**, e testei `node ./dist/server.js` (equivalente ao `npm start`) rodando de verdade contra o Neon com credenciais de teste
  - Dependencies: None
  - Files: `package.json`
  - Scope: XS
  - **Bug pré-existente encontrado e corrigido (fora do escopo original, mas bloqueava `npm start`):** `package.json.imports["#env"]` apontava para `./dist/config/env.js`, mas o arquivo real compila para `./dist/core/config/env.js` (`src/core/config/env.ts`). Sem essa correção, `npm start`/produção nunca teria funcionado, mesmo antes desta feature.

- [x] Task 10: Lint/format final
  - Acceptance: nenhum erro novo introduzido
  - Verify: `npx biome check .` — 1 erro real era meu (`forEach` retornando valor em `auth.ts`, corrigido); os outros 2 erros (`env.ts`, `tsconfig.json`) já existiam antes das minhas mudanças (mesmo estilo de indentação pré-existente) — não reformatei esses arquivos por estarem fora do escopo desta task
  - Dependencies: Tasks 1–9
  - Files: `src/presentation/routes/auth.ts`
  - Scope: XS

### Checkpoint: Completo
- [ ] Critérios de sucesso da spec 100% atendidos — **6 de 7 verificáveis sem login real; falta a volta de navegador (ver Fase 2)**
- [x] Nenhum segredo commitado (`.env` seguue no `.gitignore`; usei cópias em `/tmp` para os testes, sempre removidas)
- [ ] Pronto para revisão final com você

## Fase 5: Integração real com o frontend (client/)

- [x] Task 11: Validar CORS/cookies cross-origin de verdade (client em :3001, server em :3333)
  - Verify: subi os dois servidores com credenciais de teste e mandei requests com `Origin: http://localhost:3001` de verdade (não apenas same-origin como nos testes anteriores)
  - **Bug real encontrado em `src/presentation/middlewares/cors.ts` (o mesmo arquivo revisado na primeira mensagem desta conversa) e corrigido:** `corsHandle` era uma função assíncrona comum registrada via `app.register(corsHandle)`, o que cria um novo contexto de encapsulamento no Fastify. O `@fastify/cors` registrado *dentro* dela só decorava esse contexto — então o preflight `OPTIONS` funcionava (tinha os headers `access-control-allow-*`), mas toda resposta real (`GET`/`POST` de `/admin/users/*` e `/api/auth/*`, que vivem em outro plugin sibling) saía **sem** `Access-Control-Allow-Origin`/`Access-Control-Allow-Credentials`. Isso teria bloqueado silenciosamente todo fetch do navegador vindo do frontend, mesmo com o código do cliente 100% correto.
  - **Fix:** envolvido `corsHandle` com `fp()` de `fastify-plugin` (dependência nova, `fastify-plugin@^6.0.0`) para que o registro do CORS quebre o encapsulamento e valha globalmente. Confirmado depois: `GET /admin/users/pending`, `GET /api/auth/get-session` e `POST /api/auth/sign-in/social` agora retornam os headers de CORS corretos com `Origin: http://localhost:3001`.
  - Files: `src/presentation/middlewares/cors.ts`, `package.json`
  - Scope: S

- [x] Task 12: Restringir CORS a uma única origem (pedido seu, após validar a integração)
  - Acceptance: CORS não usa mais `origin: true` (reflete qualquer origem); aceita apenas `CLIENT_URL`
  - Files: `src/presentation/middlewares/cors.ts`, `src/core/config/env.ts`, `.env.example`, `.env`
  - Verify: com o servidor real rodando (você já preencheu `GOOGLE_CLIENT_ID`/`SECRET` nesse meio tempo), testei `Origin: http://localhost:3001` e `Origin: http://localhost:9999` — os dois recebem `access-control-allow-origin: http://localhost:3001` fixo, então o navegador só aceita a resposta quando a página realmente roda em `:3001`. `npx tsc --noEmit` OK.
  - Scope: XS
  - **Follow-up necessário:** depois desse fix você viu `ERROR [Better Auth]: Invalid origin: http://localhost:3001` — o Better Auth tem sua própria checagem de origem confiável, separada do CORS do Fastify. Adicionei `trustedOrigins: [env.CLIENT_URL]` em `src/infra/libs/auth.ts`. Testado de novo: `POST /api/auth/sign-in/social` com `Origin: http://localhost:3001` volta 200 sem erro.

- [x] Task 13: Corrigir schema do Account — faltava o campo `issuer`
  - **Bug real:** ao tentar completar o login de verdade (você chegou a testar no navegador), o callback OAuth quebrou em `findAccountOwnerByKey` (`better-auth/dist/db/internal-adapter.mjs`). Motivo: o `better-auth@1.7.1` espera um campo `issuer` na tabela `account` (usado como chave de busca junto com `accountId`) que **não existia** no schema que escrevi à mão na Task 3 — conferi isso agora contra `node_modules/@better-auth/core/dist/db/schema/account.mjs` (fonte de verdade), não contra minha lembrança de tutoriais antigos, que é onde a lacuna entrou.
  - **Fix:** adicionado `issuer String` + `@@unique([issuer, accountId])` no model `Account` (`prisma/schema.prisma`); migration `20260821144223_add_account_issuer` criada manualmente (a tabela estava vazia — 0 contas, já que ninguém tinha conseguido logar por causa desse bug — então `ALTER TABLE ... ADD COLUMN ... NOT NULL` direto é seguro) e aplicada via `prisma migrate deploy`; `prisma generate` rodado de novo.
  - Conferi também os outros três models (`User`, `Session`, `Verification`) contra as mesmas fontes de verdade (`user.mjs`, `session.mjs`, `verification.mjs`) — todos batem, o `issuer` do `Account` era a única lacuna.
  - **Importante:** seu `tsx watch` não recarrega automaticamente quando só o `node_modules/@prisma/client` muda (ele não observa `node_modules`). Você precisa **reiniciar o `npm run dev`** manualmente antes de tentar o login de novo.
  - Files: `prisma/schema.prisma`, `prisma/migrations/20260821144223_add_account_issuer/migration.sql`
  - Scope: S

- [x] Task 14: Bootstrap do owner (não era bug — comportamento correto, mas com um problema de design real)
  - **O que você viu:** `ERROR [Better Auth]: unable_to_create_session` ao logar de verdade com seu próprio email. Confirmei lendo `better-auth/dist/oauth2/link-account.mjs`: essa mensagem é exatamente o que o Better Auth loga quando `databaseHooks.session.create.before` retorna `false` — ou seja, o cadastro (`User` + `Account`) funcionou 100%, só a sessão foi bloqueada de propósito, porque o usuário nasceu `PENDING`. Confirmei consultando o banco: seu usuário estava lá com `status: PENDING`.
  - **Problema real que isso expôs:** você (dono) também nasce `PENDING` no primeiro login — e só o dono pode aprovar pendentes. Sem correção, ninguém consegue aprovar o primeiro dono.
  - **Fix:** `databaseHooks.user.create.before` em `src/infra/libs/auth.ts` — se `user.email === env.OWNER_EMAIL`, o usuário já nasce com `status: APPROVED`. Só afeta cadastros novos.
  - Aprovei manualmente o registro seu que já tinha sido criado antes do fix (`UPDATE` direto via Prisma, um usuário só, ação pontual).
  - Files: `src/infra/libs/auth.ts`
  - Scope: XS

- [x] Task 15: Redirecionar erros de login pro frontend, não pro backend
  - **Problema encontrado ao investigar a pergunta "e usuário comum, dá o mesmo erro?":** sim, dá o mesmo bloqueio de sessão pra qualquer usuário `PENDING`/`BLOCKED` — mas ao ler `better-auth/dist/api/routes/callback.mjs` vi que, sem configurar `onAPIError.errorURL`, o Better Auth redireciona o navegador pra `${BETTER_AUTH_URL}/error?error=...` — ou seja, pro **backend** (`localhost:3333`), uma rota que nem existe na nossa API. O usuário cairia num 404 cru, sem nenhuma explicação, desconectado do frontend.
  - **Fix:** `onAPIError.errorURL: `${env.CLIENT_URL}/?unauthorized=1`` em `src/infra/libs/auth.ts`. Isso reaproveita o banner que já existe na tela de login (`showUnauthorizedBanner`) e ainda anexa `&error=<code>` na URL pra diagnóstico futuro.
  - Verify: simulei o fluxo (sign-in real + callback com state inválido, mesmo código de redirecionamento do `unable_to_create_session`) — confirmado `location: http://localhost:3001/?unauthorized=1&error=state_not_found`.
  - Files: `src/infra/libs/auth.ts`
  - Scope: XS

- [x] Task 16: `callbackURL` relativo mandava o navegador pro backend, não pro frontend (bug real reportado por você)
  - **Sintoma:** login bem-sucedido caía em `http://localhost:3333/dashboard` (404) em vez de `http://localhost:3001/dashboard`.
  - **Causa:** `client/src/service/auth-service.ts` passava `callbackURL: "/dashboard"` (relativo). O Better Auth resolve URL relativa contra o `baseURL` dele mesmo (o backend), não contra a origem de quem chamou.
  - **Fix (client/):** `callbackURL: `${window.location.origin}/dashboard`` (absoluto) + `errorCallbackURL: `${window.location.origin}/?unauthorized=1`` nas duas funções (`signInWithGoogle`/`signInWithDiscord`), como você sugeriu. Isso cobre o caso de erro por chamada, além do fallback genérico do `onAPIError.errorURL` já configurado no backend (Task 15).
  - Verify: `npx tsc --noEmit` OK; `npx biome check` limpo; conferido que não havia mais nenhum outro `callbackURL` relativo no client.
  - Files: `client/src/service/auth-service.ts`
  - Scope: XS

## Fase 6: Integração com Discord (vínculo de contas)

- [x] Task 17: Backend — vincular Google e Discord pela mesma pessoa
  - **Objetivo (seu):** capturar o Discord user ID da pessoa e salvar num campo acessível independente de ela logar com Google ou Discord.
  - `discordUserId String? @unique` adicionado ao `User` (migration `add_discord_user_id`).
  - Confirmei nas configs do Better Auth (`@better-auth/core`) que `accountLinking.allowDifferentEmails` já é `false` por padrão — ou seja, só vincula contas com o **mesmo email**, exatamente a regra que você descreveu ("é o mesmo email, só uma forma diferente de logar"). Nada a mudar aí.
  - `databaseHooks.account.create.after` em `src/infra/libs/auth.ts`: toda vez que uma conta Discord é criada (seja no cadastro direto via Discord, seja num vínculo posterior via `linkSocial`), copia `account.accountId` (o ID do Discord) pra `user.discordUserId`.
  - Nova rota `GET /me/integrations` (qualquer usuário logado, novo middleware `requireAuth`) retorna `{ discordLinked: boolean }` — segue a mesma arquitetura em camadas (core/infra/presentation/factory) das rotas de admin.
  - O vínculo em si (`linkSocial`) usa endpoint pronto do Better Auth (`/api/auth/link-social`), já coberto pelo nosso proxy `/api/auth/*` — não precisei criar rota nova pra isso.
  - Verify: `npx tsc --noEmit` e `npx biome check` limpos; `GET /me/integrations` sem sessão retorna 401 (confirmado)
  - Files: `prisma/schema.prisma`, `prisma/migrations/20260821150749_add_discord_user_id/`, `src/infra/libs/auth.ts`, `src/presentation/middlewares/require-auth.ts`, `src/presentation/protocols/controller.ts`, `src/presentation/adapters/fastify-route-adapter.ts`, `src/core/repositories/user-repository.ts`, `src/infra/repositories/prisma-user-repository.ts`, `src/core/use-cases/get-my-integrations.ts`, `src/infra/use-cases/get-my-integrations.ts`, `src/presentation/controllers/get-my-integrations-controller.ts`, `src/infra/factories/make-get-my-integrations-controller.ts`, `src/presentation/routes/me.ts`, `src/presentation/routes/routes.ts`
  - Scope: M
  - **Pendente de verificação manual:** o vínculo de verdade (logar com Google, ir em Integrações, clicar "conectar Discord") só dá pra confirmar com você testando no navegador.

- [x] Task 18: Migração completa de CSS Modules para Tailwind CSS v4 (client/)
  - Instalado `tailwindcss` + `@tailwindcss/postcss`; `postcss.config.mjs` novo; `globals.css` reescrito com `@import "tailwindcss"` + bloco `@theme` (paleta clara como base) + override `:root[data-theme="dark"]` (paleta escura) — os mesmos tokens de cor de antes, agora como utilities nativas do Tailwind (`bg-surface`, `text-foreground`, `bg-status-pending-bg`, etc.)
  - **Ajuste na estratégia de dark mode:** antes o CSS reagia a `prefers-color-scheme` diretamente; agora o `ThemeInitializer` sempre resolve e fixa um `data-theme="light"`/`"dark"` concreto (nunca deixa "system" ambíguo no DOM), e um script bloqueante inline no `<head>` do `layout.tsx` decide o tema antes da hidratação (lê `localStorage`, cai pra `matchMedia` se não houver preferência salva) — evita flash de tema errado.
  - Todos os 18 arquivos `.module.css` deletados; todos os componentes/páginas reescritos com classes Tailwind, preservando o visual (cores, espaçamento, cantos arredondados, sombras) que você disse ter gostado. Duas animações customizadas (`fade-in`, `scale-in` do modal) viraram `--animate-*` no `@theme`.
  - `biome.json` do client: habilitei `css.parser.tailwindDirectives` e `cssModules`, senão o Biome não reconhece `@theme`.
  - Verify: `npx tsc --noEmit` e `npx biome check .` limpos; `npm run build` gerou os 7 assets estáticos normalmente; CSS final tem 33KB com as classes/animações customizadas confirmadas dentro do arquivo gerado; testado via `curl` que as classes Tailwind aparecem de fato no HTML renderizado.
  - Files: `postcss.config.mjs`, `biome.json`, `src/styles/globals.css`, `src/app/layout.tsx`, `src/components/ThemeInitializer.tsx`, `src/components/cn.ts` (novo helper), e todos os componentes/páginas listados nas tasks anteriores (reescritos, sem CSS module)
  - Scope: L

- [x] Task 19: Menu do avatar (dropdown) com Integrações + Sair
  - Novo `src/components/UserMenu.tsx`: clique no avatar abre um menu (fecha ao clicar fora, ao apertar Escape, `role="menu"`/`aria-haspopup`/`aria-expanded`), com link para `/integrations` e botão de logout. Substituiu o botão "Sair" solto que existia antes no Header.
  - Verify: `npx tsc --noEmit` e `npx biome check` limpos.
  - Files: `src/components/UserMenu.tsx`, `src/layout/Header.tsx`
  - Scope: S

- [x] Task 20: Backfill do `discordUserId` para vínculo feito antes do hook existir
  - Você reportou que a tela de Integrações não mostrava "conectado" mesmo já tendo vinculado o Discord. Investigando: já existia uma linha em `account` (`providerId: discord`) pro seu usuário, mas `user.discordUserId` estava `null` — esse vínculo foi feito **antes** de eu adicionar o hook `databaseHooks.account.create.after` (Task 17), então nunca foi copiado. O hook em si está correto para qualquer vínculo novo a partir de agora.
  - **Fix:** script pontual (`prisma.account.findMany({ providerId: "discord" })` → `prisma.user.update` com o `accountId`) rodado uma vez pra backfillar o único registro afetado. Não é uma mudança de código — é dado.
  - Verify: `user.discordUserId` confirmado igual ao `account.accountId` depois do backfill.
  - Scope: XS

## Fase 7: Integração com Zammad (token de API)

- [x] Task 21: Backend — conectar Zammad via token, cifrado em repouso
  - **Decisão sua:** cifrar o token (não texto puro), usando o `TokenCipher` (AES-256-GCM + `keyVersion`) que você passou pronto — só limpei o comentário que referenciava outro projeto ("RNF-13"/"Zappy"), o algoritmo é exatamente o que você mandou.
  - Nova tabela `zammad_integration` (1:1 com `User`): `ciphertext`, `iv`, `tag`, `keyVersion`, `last4` — nunca guardamos o token em texto puro.
  - Nova env var `TOKEN_ENCRYPTION_KEY` (32 bytes base64, gerei uma real e já coloquei no `.env`) e `ZAMMAD_BASE_URL=https://zammad.innovtechsolutions.com.br`.
  - `src/infra/libs/zammad-client.ts`: antes de salvar, valida o token de verdade contra `GET {ZAMMAD_BASE_URL}/api/v1/users/me` com header `Authorization: Token token=...` (confirmei o formato na doc oficial do Zammad, não assumi de memória) — testei com um token inválido contra o Zammad real e ele rejeitou corretamente.
  - `POST /me/integrations/zammad` (`requireAuth`) — schema zod, use-case, controller, factory, seguindo a mesma arquitetura em camadas das outras features.
  - `GET /me/integrations` estendido: agora retorna `zammadConnected` e `zammadLast4` (nunca o token, nem cifrado) além do `discordLinked` que já existia.
  - Verify: testei a cadeia inteira direto (sem HTTP) — token inválido → 400 com mensagem clara; sem token → 400 (erro do zod); sem sessão → 401; round-trip de criptografia (`encrypt`→`decrypt`) confirmado idêntico ao original; `GET /me/integrations` do seu usuário real retornou `zammadConnected: false` corretamente (você ainda não conectou de verdade).
  - Files: `prisma/schema.prisma`, `prisma/migrations/20260821153434_add_zammad_integration/`, `src/infra/libs/token-cipher.ts`, `src/infra/libs/zammad-client.ts`, `src/core/repositories/zammad-integration-repository.ts`, `src/infra/repositories/prisma-zammad-integration-repository.ts`, `src/core/use-cases/{connect-zammad,get-my-integrations}.ts`, `src/infra/use-cases/{connect-zammad,get-my-integrations}.ts`, `src/presentation/schemas/zammad-integration-schema.ts`, `src/presentation/controllers/connect-zammad-controller.ts`, `src/infra/factories/{make-connect-zammad-controller,make-get-my-integrations-controller}.ts`, `src/presentation/routes/me.ts`, `src/core/config/env.ts`, `.env`, `.env.example`
  - Scope: M

- [x] Task 22: Frontend — card do Zammad na tela de Integrações, com "olho" pra mostrar/ocultar o token
  - **Nota importante:** Zammad não tem uma logo tão reconhecível/reproduzível quanto Google ou Discord, e eu não tinha certeza suficiente do desenho exato da marca deles pra recriar fielmente (arriscar uma logo errada é pior que não ter). Usei um ícone genérico de suporte (`LifeBuoy`, do Lucide) em vez disso — se você tiver o SVG oficial da marca, me manda que eu troco.
  - Novo `src/components/ui/PasswordInput.tsx`: campo de token com botão de olho (mostrar/ocultar), reutilizável para qualquer campo sensível no futuro.
  - Card do Zammad mostra: se conectado, "Conectado" + últimos 4 dígitos do token (`•••• 1234`); se não, um formulário (token + link direto pra página de tokens do Zammad que você passou + botão Conectar) com mensagem de erro inline se o token for rejeitado.
  - Também melhorei o `http-client.ts`: erros agora propagam a mensagem real do backend (ex: "Token do Zammad inválido") em vez de um texto genérico — beneficia qualquer chamada futura, não só essa.
  - Verify: `npx tsc --noEmit`, `npx biome check .` e `npm run build` limpos.
  - Files: `src/components/ui/PasswordInput.tsx`, `src/service/integrations-service.ts`, `src/service/http-client.ts`, `src/app/(app)/integrations/page.tsx`
  - Scope: M
  - **Pendente de verificação manual:** testar com um token real do Zammad (só você tem acesso pra gerar um).

## Fase 8: Gate de cadastro pelo diretório de usuários do Zammad

Spec: [specs/002-zammad-user-directory-gate.md](../specs/002-zammad-user-directory-gate.md). Decisões confirmadas com você: vale pra qualquer cadastro (não só o dono); bater com o Zammad não auto-aprova, só libera passar pelo fluxo de aprovação manual que já existe.

- [x] Task 23: `Zammad.listAllUsers()` — paginado
  - Acceptance: novo método na classe `Zammad` percorre todas as páginas de `GET /api/v1/users` até vir uma incompleta, retorna a lista completa
  - Verify: testado contra o Zammad real — 24 usuários retornados corretamente, inclusive depois de você reduzir `USERS_PER_PAGE` pra 10 (confirma que a paginação percorre múltiplas páginas de verdade, não só assume 1 página)
  - Files: `src/infra/libs/zammad-client.ts`

- [x] Task 24: `ZAMMAD_TOKEN` no env
  - Acceptance: nova var validada no `env.ts`, documentada no `.env.example`
  - **Ajuste:** você já tinha colocado um `ZAMMAD_TOKEN` no `.env` real por conta própria — usei esse nome em vez de criar `ZAMMAD_ADMIN_TOKEN` como a spec previa, pra não duplicar. Já tinha um valor real, então nem precisei bloquear esperando você preencher.
  - Files: `src/core/config/env.ts`, `.env.example`

- [x] Task 25: Campo `ownerId` no `User`
  - Acceptance: `ownerId String? @unique` no schema, migration aplicada
  - Verify: `npx prisma migrate deploy` OK
  - Files: `prisma/schema.prisma`, `prisma/migrations/20260821165803_add_owner_id/`

- [x] Task 26: Hook de gate no cadastro
  - Acceptance: `databaseHooks.user.create.before` em `auth.ts` busca o email na lista paginada do Zammad (case-insensitive); se achar, inclui `ownerId` nos dados e segue o fluxo (incluindo a regra existente do `OWNER_EMAIL`); se não achar, retorna `false`
  - Verify: testei a lógica de match direto contra os 24 usuários reais — email conhecido (`matheussantosspbr@gmail.com`, id 5) bate certo, o mesmo email em maiúsculas também bate (case-insensitive OK), email desconhecido não bate. `npx tsc --noEmit` e `npx biome check` limpos. Servidor reiniciou sozinho e segue respondendo normalmente com a env var nova.
  - Files: `src/infra/libs/auth.ts`

### Checkpoint
- [x] Lógica de match validada com dados reais do Zammad (bate, bate case-insensitive, não bate)
- [ ] **Pendente de verificação manual:** cadastro real de ponta a ponta (login novo → `ownerId` preenchido no banco) só dá pra confirmar você testando no navegador com um email que exista/não exista no Zammad
- [x] `ZAMMAD_TOKEN` nunca aparece em nenhum log (só usado internamente pela classe `Zammad`)

## Fase 9: Sincronização dos tickets do admin com o Zammad

Spec: [specs/003-zammad-owner-tickets-sync.md](../specs/003-zammad-owner-tickets-sync.md). Escopo "1 admin": só o `OWNER_EMAIL`, tickets onde ele é `owner_id`. Visibilidade por `customer_id` fica pra um passo futuro.

- [x] Task 27: `Zammad.searchTicketsByOwner(ownerId)` — paginado
  - Acceptance: usa `GET /api/v1/tickets/search` com `condition[ticket.owner_id]`, percorre páginas até vir incompleta
  - Verify: testado contra o Zammad real — **12 tickets**, batendo exatamente com o `total_count: 12` do print que você mandou
  - Files: `src/infra/libs/zammad-client.ts`

- [x] Task 28: `@@unique` em `ticketId`
  - Acceptance: migration aplicada, upsert por `ticketId` possível
  - Files: `prisma/schema.prisma`, `prisma/migrations/20260821180303_ticket_id_unique/`

- [x] Task 29: Repository + use-case + factory (`SyncOwnerTicketsUseCase`)
  - Acceptance: mapeia `id→ticketId`, `number→ticketNumber`, `title→title`, `state→ticketStatus` (espaço vira `_`), objeto inteiro `→ticketJson`; upsert por `ticketId`
  - Verify: rodei contra o Zammad e o banco reais — 12 tickets salvos com os campos certos (`pending_reminder`, `pending_close`, `closed`, etc.); rodei de novo e continuou 12 (upsert idempotente, sem duplicar)
  - Files: `src/core/repositories/ticket-repository.ts`, `src/infra/repositories/prisma-ticket-repository.ts`, `src/core/use-cases/sync-owner-tickets.ts`, `src/infra/use-cases/sync-owner-tickets.ts`, `src/infra/factories/make-sync-owner-tickets-use-case.ts`

- [x] Task 30: Hook `user.create.after` — dispara o worker
  - Acceptance: só quando `user.email === env.OWNER_EMAIL` e `ownerId` foi definido; fire-and-forget (não usa `await` no fluxo principal), erro cai num `.catch` que só loga, não derruba o cadastro/login
  - Files: `src/infra/libs/auth.ts`
  - **Pendente de verificação manual:** só dá pra confirmar o disparo automático de verdade com um cadastro novo do dono (a conta atual já existia antes do hook, por isso rodei a sincronização manualmente pra validar a lógica)

### Checkpoint
- [x] 12 tickets reais sincronizados, campos mapeados certos
- [x] Rodar de novo não duplica
- [ ] Disparo automático via cadastro real (não testável sem um novo signup do `OWNER_EMAIL`)

## Fase 10: Worker de verdade (BullMQ + Redis), em vez de fire-and-forget

Motivo: você decidiu trocar de hospedagem (Railway/Render/Fly, processo contínuo) em vez de adaptar pra serverless — mas depois pediu um worker de verdade (fila separada) mesmo assim, escolhendo BullMQ + Redis.

- [x] Task 31: Fila (`src/infra/libs/queue.ts`) — `Queue` do BullMQ + conexão `ioredis`
  - Acceptance: `syncOwnerTicketsQueue`, nova env var `REDIS_URL`
  - Files: `src/infra/libs/queue.ts`, `src/core/config/env.ts`, `.env.example`

- [x] Task 32: `src/worker.ts` — processo separado de verdade
  - Acceptance: entrypoint novo (não é mais dentro do `server.ts`), roda com `npm run worker` (dev) / `npm run worker:start` (prod, depois do `npm run build`), consome a fila e chama o mesmo `SyncOwnerTicketsUseCase` de antes
  - Files: `src/worker.ts`, `package.json`

- [x] Task 33: Hook só enfileira
  - Acceptance: `user.create.after` agora só dá `queue.add(...)` (rápido, com `await` — se o Redis estiver fora do ar, você fica sabendo na hora, em vez de perder o job silenciosamente como no fire-and-forget)
  - Files: `src/infra/libs/auth.ts`

- [x] Task 34: Teste de ponta a ponta de verdade
  - Subi um Redis descartável via Docker (só pra esse teste, removido depois — não mexi no Redis de outro projeto que já tinha rodando), apaguei os 12 tickets do banco, subi o worker como processo separado, enfileirei um job real → o worker (rodando num processo distinto) processou e recriou os 12 tickets certinhos. Confirma que a arquitetura "hook enfileira / worker processa em outro processo" funciona de verdade, não só no papel.
  - Scope: validação, sem arquivos novos

### Checkpoint
- [x] Worker roda como processo separado (`node dist/worker.js`), não dentro do servidor HTTP
- [x] Fluxo completo testado com Redis real (Docker descartável) — enfileirar → processar → salvar no banco
- [ ] **Bloqueio real:** falta `REDIS_URL` no seu `.env` — sem isso o servidor volta a dar erro de env inválida (mesmo padrão de antes com `GOOGLE_CLIENT_ID`). Você vai precisar de um Redis de verdade em produção também (Railway/Render têm addon; Upstash tem plano grátis que funciona bem com BullMQ).

## Fase 11: Integração dos tickets reais com o frontend

Escopo confirmado com você: só dashboard + lista de tickets agora. Tela de detalhe/chat continua fora — backend ainda não busca mensagens/artigos do Zammad (item futuro).

- [x] Task 35: Backend — `GET /tickets` e `GET /tickets/stats`
  - Acceptance: `requireAuth` (qualquer usuário logado, tickets são sempre os do próprio usuário); mapeia os 5 status reais do Zammad (`new`, `open`, `pending_reminder`, `pending_close`, `closed`) pros 3 buckets que o frontend já esperava (`OPEN`/`PENDING`/`CLOSED`) — `new`+`open`→OPEN, `pending_*`→PENDING, `closed`→CLOSED
  - Segue a mesma arquitetura em camadas: `ITicketRepository.findByUserId` novo, `ListMyTicketsUseCase`/`GetMyTicketStatsUseCase`, controllers, factories. Mapeamento de status em `src/core/entities/ticket-status.ts` (usei a pasta `core/entities` que você já tinha criado)
  - Verify: sem sessão → 401 (confirmado). Testado direto com o `userId` real do dono: `/tickets` retornou os 12 tickets certos (id, subject, status, datas vindas do `ticketJson`); `/tickets/stats` retornou `{total: 12, open: 0, pending: 4, closed: 8}` — bate com os dados reais sincronizados na Fase 9
  - Files: `src/core/entities/ticket-status.ts`, `src/core/repositories/ticket-repository.ts`, `src/infra/repositories/prisma-ticket-repository.ts`, `src/core/use-cases/{list-my-tickets,get-my-ticket-stats}.ts`, `src/infra/use-cases/{list-my-tickets,get-my-ticket-stats}.ts`, `src/presentation/controllers/{list-my-tickets,get-my-ticket-stats}-controller.ts`, `src/infra/factories/make-{list-my-tickets,get-my-ticket-stats}-controller.ts`, `src/presentation/routes/tickets.ts`, `src/presentation/routes/routes.ts`

- [x] Task 36: Frontend — troca o mock por dados reais
  - Acceptance: `listTickets()`/`getTicketStats()` em `tickets-service.ts` agora chamam a API real; `getTicket()` (nunca usado em lugar nenhum do app — confirmei via grep) e todo o `MOCK_TICKETS` foram removidos
  - **Decisão explícita, não escondida:** `sendTicketMessage()` continua mockado (só atualiza o estado local, não persiste) — a tela de detalhe/chat ficou fora do escopo desta rodada. Se você clicar num ticket real e "responder", a mensagem aparece na tela mas some ao recarregar a página.
  - Verify: `npx tsc --noEmit`, `npx biome check .` e `npm run build` limpos; bundle até ficou menor (menos código de mock)
  - Files: `src/service/tickets-service.ts`
  - Scope: S

## Fase 12: Mensagens reais do ticket (chat) + anexos

- [x] Task 37: `Zammad.getTicketArticles(ticketId)` e `Zammad.getAttachment(ticketId, articleId, attachmentId)`
  - Acceptance: busca `/api/v1/ticket_articles/by_ticket/:id` (sem paginação — resposta é array simples, confirmado nos dados reais) e `/api/v1/ticket_attachment/:ticketId/:articleId/:attachmentId` (binário)
  - Verify: testado contra o Zammad real — 9 artigos do ticket 246, batendo exatamente com o exemplo que você mandou; anexo real baixado (134164 bytes, `image/png`, filename decodificado corretamente do `Content-Disposition`, que vinha URL-encoded)
  - Files: `src/infra/libs/zammad-client.ts`

- [x] Task 38: `GET /tickets/:ticketId/messages` — mensagens mapeadas
  - Acceptance: `sender: "Agent"` (você, o dono) → `author: "user"` (aparece como "minha" mensagem, alinhada à direita); `sender: "Customer"/"System"` → `author: "agent"`. Nome extraído de `from` (remove o `<email>`). Anexos viram URLs relativas pro proxy (`/tickets/:id/articles/:articleId/attachments/:attachmentId`), nunca a URL direta do Zammad. Checagem de dono do ticket (`ticket.userId === request.userId`) antes de expor qualquer mensagem — 404 tanto pra ticket inexistente quanto pra ticket de outro usuário (não vaza qual dos dois é o caso)
  - Verify: testado com o `userId` real — 2 primeiras mensagens do ticket 246 bateram exatamente (nome "Carlos Alberto" extraído certo, HTML preservado, anexos com URLs de proxy corretas); testei os dois casos de 404 (ticket inexistente e ticket de outro usuário) separadamente
  - Files: `src/core/use-cases/list-ticket-messages.ts`, `src/infra/use-cases/list-ticket-messages.ts`, `src/presentation/controllers/list-ticket-messages-controller.ts`, `src/infra/factories/make-list-ticket-messages-controller.ts`, `src/core/repositories/ticket-repository.ts` (+ `findByTicketId`), `src/infra/repositories/prisma-ticket-repository.ts`

- [x] Task 39: Proxy de anexo — `GET /tickets/:ticketId/articles/:articleId/attachments/:attachmentId`
  - Acceptance: rota raw do Fastify (não passa pelo `adaptRoute`, que é JSON-only — mesmo precedente do proxy `/api/auth/*`), checa dono do ticket, busca o binário no Zammad com o `ZAMMAD_TOKEN` de serviço, repassa `Content-Type` real pro navegador. Frontend nunca fala direto com o Zammad nem vê o token.
  - Files: `src/presentation/routes/tickets.ts`

- [x] Task 40: Frontend — chat real com HTML sanitizado
  - `dompurify` novo (sanitiza HTML antes de `dangerouslySetInnerHTML` — nunca renderiza o body do Zammad cru, é conteúdo de terceiros/clientes)
  - `ChatMessage.tsx`: distingue `text/html` (sanitizado) de `text/plain`; mostra badge "Nota interna" quando `internal: true` (visível só pra você, o agente — igual ao próprio Zammad faz)
  - `MediaAttachment.tsx`: novo fallback genérico (ícone + link) pra anexos que não são imagem/vídeo
  - **Removido código morto:** `ChatComposer.tsx` (componente inteiro), `sendMessage`/`sendTicketMessage` — não tinha mais nenhuma chamada real desde que a resposta a ticket foi trocada por um aviso "ainda não disponível" (não faz sentido manter um formulário que parece funcionar mas não persiste nada, ainda mais ao lado de mensagens reais)
  - Verify: `npx tsc --noEmit`, `npx biome check .` e `npm run build` limpos
  - Files: `src/components/ChatMessage.tsx`, `src/components/MediaAttachment.tsx`, `src/app/(app)/tickets/[id]/page.tsx`, `src/store/tickets-store.ts`, `src/service/tickets-service.ts`
  - Scope: M

### ⚠️ Risco de produção identificado (não corrigido, precisa de decisão sua)
Os anexos usam `<img src>`/`<video src>` direto pro backend, autenticados só pelo cookie de sessão do Better Auth (`SameSite=Lax`). Isso funciona em dev porque `localhost:3001` e `localhost:3333` contam como "mesmo site" (browsers ignoram a porta pra isso). **Mas se front e back ficarem em domínios diferentes de verdade em produção** (ex: Vercel + Railway, que foi o plano discutido), `SameSite=Lax` **não envia o cookie** nessas requisições — as imagens dos tickets (e possivelmente outras chamadas autenticadas) vão falhar com 401. Isso não é exclusivo dos anexos: **qualquer chamada autenticada cross-domain tem esse mesmo risco**, incluindo as que já existem (`/tickets`, `/me/integrations`, etc.) — só não apareceu ainda porque nunca testamos com domínios de verdade diferentes.
- **Fix padrão:** configurar o cookie de sessão do Better Auth com `SameSite=None; Secure` (exige HTTPS, que Vercel/Railway já dão de graça) em vez do `Lax` padrão.
- Não apliquei essa mudança agora porque é uma configuração de segurança que afeta o app inteiro, não só os anexos — prefiro seu aval antes de mexer nisso.
