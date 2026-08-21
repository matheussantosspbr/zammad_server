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

- [ ] Task 3: Prisma init + schema Better Auth + `UserStatus` + migration
  - Acceptance: `prisma/schema.prisma` criado com datasource Postgres; `npx @better-auth/cli generate` populou `User`/`Session`/`Account`/`Verification`; `UserStatus` (`PENDING`/`APPROVED`/`BLOCKED`, default `PENDING`) adicionado ao `User`; migration aplicada
  - Verify: `npx prisma migrate dev --name init` e `npx prisma generate` sem erro; inspecionar tabelas (ex: `npx prisma studio`)
  - Dependencies: Task 1, Task 2 (precisa de `DATABASE_URL` real no `.env`)
  - Files: `prisma/schema.prisma`, `prisma/migrations/**`
  - Scope: M
  - **Bloqueio:** preciso que você preencha `DATABASE_URL` no `.env` local antes de eu rodar a migration.

### Checkpoint: Fundação
- [ ] `prisma migrate dev` e `prisma generate` OK
- [ ] Tabelas corretas no banco
- [ ] `env.ts` falha com mensagem clara se faltar var
- [ ] Revisão com você antes de prosseguir

## Phase 2: Núcleo de autenticação

- [ ] Task 4: Prisma client singleton
  - Acceptance: `src/infra/libs/prisma.ts` exporta uma instância única de `PrismaClient` (evita múltiplas conexões em hot-reload do `tsx watch`)
  - Verify: `npx tsc --noEmit` sem erro; import em outro arquivo funciona
  - Dependencies: Task 3
  - Files: `src/infra/libs/prisma.ts`
  - Scope: XS

- [ ] Task 5: Instância Better Auth
  - Acceptance: `src/infra/libs/auth.ts` exporta `auth` configurado com `prismaAdapter(prisma)`, `socialProviders: { google, discord }` lendo client id/secret do `env`, e `databaseHooks.session.create.before` rejeitando (`APIError`) quando `user.status !== "APPROVED"`
  - Verify: `npx tsc --noEmit` sem erro; conferir na API real do `better-auth` instalado (`node_modules/better-auth`) os nomes exatos de `prismaAdapter`/`databaseHooks` antes de fechar a task
  - Dependencies: Task 4
  - Files: `src/infra/libs/auth.ts`
  - Scope: M

- [ ] Task 6: Montar `/api/auth/*`
  - Acceptance: todas as rotas do Better Auth (sign-in, callback, sign-out, session, etc.) respondem sob `/api/auth/*`
  - Verify: com o servidor rodando, `curl` em uma rota conhecida do better-auth (ex: `/api/auth/session`) retorna resposta do better-auth, não 404 do Fastify
  - Dependencies: Task 5
  - Files: `src/presentation/routes/auth.ts`, `src/presentation/routes/routes.ts`
  - Scope: S

### Checkpoint: Núcleo de autenticação
- [ ] `npm run dev` sobe sem erro
- [ ] Login real via Google cria `User` `PENDING` sem sessão válida
- [ ] Login real via Discord: mesmo comportamento
- [ ] **Bloqueio:** preciso das suas credenciais OAuth reais (Google/Discord) configuradas no `.env` para validar este checkpoint manualmente

## Phase 3: Aprovação administrativa

- [ ] Task 7: Middleware `requireOwner`
  - Acceptance: `preHandler` que resolve a sessão do Better Auth a partir do request e retorna `401` sem sessão, `403` se `session.user.email !== env.OWNER_EMAIL`
  - Verify: manual — request sem cookie de sessão → 401; com sessão de outro usuário → 403
  - Dependencies: Task 5
  - Files: `src/presentation/middlewares/require-owner.ts`
  - Scope: S

- [ ] Task 8: Rotas administrativas
  - Acceptance: `GET /admin/users/pending` lista `status = PENDING`; `POST /admin/users/:id/approve` seta `APPROVED`; `POST /admin/users/:id/block` seta `BLOCKED`; todas usam `requireOwner`
  - Verify: manual — fluxo completo (listar → aprovar → login funciona → bloquear → login falha)
  - Dependencies: Task 4, Task 7
  - Files: `src/presentation/routes/admin-users.ts`, `src/presentation/routes/routes.ts`
  - Scope: M

### Checkpoint: Fluxo completo
- [ ] Todos os 7 critérios de sucesso da spec conferidos manualmente
- [ ] Rotas administrativas retornam `403` para não-owner

## Phase 4: Polimento

- [ ] Task 9: Script `build`
  - Acceptance: `"build": "tsc"` (ou equivalente) em `package.json`
  - Verify: `npm run build` gera `dist/` sem erro
  - Dependencies: None (pode rodar a qualquer momento)
  - Files: `package.json`
  - Scope: XS

- [ ] Task 10: Lint/format final
  - Acceptance: nenhum erro novo introduzido
  - Verify: `npx biome check .`
  - Dependencies: Tasks 1–9
  - Files: possivelmente nenhum (só verificação)
  - Scope: XS

### Checkpoint: Completo
- [ ] Critérios de sucesso da spec 100% atendidos
- [ ] Nenhum segredo commitado
- [ ] Pronto para revisão final com você
