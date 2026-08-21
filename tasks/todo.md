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
