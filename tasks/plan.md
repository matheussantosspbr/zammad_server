# Implementation Plan: Prisma + Better Auth (Google/Discord) com aprovação manual

Spec de referência: [specs/001-prisma-better-auth.md](../specs/001-prisma-better-auth.md)

## Overview

Adicionar Prisma (Postgres) e Better Auth ao servidor Fastify, restringindo login a Google e Discord. Todo usuário novo nasce `PENDING` e não recebe sessão até o dono do sistema (`OWNER_EMAIL`) aprovar via rota administrativa. O trabalho é majoritariamente infraestrutura (schema → client → auth → middleware → rotas), então a ordem segue o grafo de dependências de baixo para cima, com verificação manual real (OAuth de verdade) nos checkpoints, já que não há suíte de testes automatizada no repo ainda.

## Architecture Decisions

- **Owner por env var (`OWNER_EMAIL`), sem campo `role` no banco** — evita o problema do "primeiro admin" e mantém o modelo de dados simples (decidido na spec).
- **Bloqueio de sessão via `databaseHooks.session.create.before`** do Better Auth, não via middleware de rota — garante que nenhuma rota autenticada seja alcançável por um usuário `PENDING`/`BLOCKED`, mesmo que uma rota esqueça de checar o status.
- **`/api/auth/*` como catch-all Fastify** delegando ao `auth.handler` do Better Auth — evita reimplementar OAuth manualmente.
- **Sem novo test runner nesta entrega** — verificação por checkpoints manuais (login real, curl/Insomnia), conforme "Testing Strategy" da spec. Se o projeto ganhar testes automatizados depois, isso é uma spec separada.

## Task List

### Phase 1: Fundação (schema, client, env)

- [ ] Task 1: Instalar dependências (`prisma`, `@prisma/client`, `better-auth`, `-D @better-auth/cli`)
- [ ] Task 2: Adicionar novas env vars ao schema zod + criar `.env.example`
- [ ] Task 3: Inicializar Prisma, gerar schema do Better Auth, estender com `UserStatus`, rodar migration

### Checkpoint: Fundação
- [ ] `npx prisma generate` e `npx prisma migrate dev` rodam sem erro
- [ ] Tabelas `User` (com `status` default `PENDING`), `Session`, `Account`, `Verification` existem no banco
- [ ] `env.ts` valida as novas vars e falha com mensagem clara se faltar alguma
- [ ] Revisar com você antes de prosseguir (T3 depende da sua `DATABASE_URL` real)

### Phase 2: Núcleo de autenticação

- [ ] Task 4: Client Prisma singleton (`src/infra/libs/prisma.ts`)
- [ ] Task 5: Instância Better Auth (`src/infra/libs/auth.ts`) — `prismaAdapter`, `socialProviders: { google, discord }`, hook de bloqueio de sessão
- [ ] Task 6: Montar `/api/auth/*` no Fastify (catch-all)

### Checkpoint: Núcleo de autenticação
- [ ] Servidor sobe sem erro (`npm run dev`)
- [ ] Login real via Google cria `User` com `status = PENDING` e Better Auth NÃO emite sessão válida
- [ ] Login real via Discord tem o mesmo comportamento
- [ ] Requer suas credenciais OAuth reais (Google Cloud Console / Discord Developer Portal) — ver Open Question da spec

### Phase 3: Aprovação administrativa

- [ ] Task 7: Middleware `requireOwner`
- [ ] Task 8: Rotas administrativas (`GET /admin/users/pending`, `POST /admin/users/:id/approve`, `POST /admin/users/:id/block`)

### Checkpoint: Fluxo completo
- [ ] `GET /admin/users/pending` (como `OWNER_EMAIL`) lista o usuário criado no checkpoint anterior
- [ ] `POST .../approve` muda o status; login subsequente do mesmo usuário gera sessão válida
- [ ] `POST .../block` impede sessão mesmo para usuário já aprovado antes
- [ ] Chamada às 3 rotas por usuário que não é `OWNER_EMAIL` retorna `403`
- [ ] Todos os 7 critérios de sucesso da spec conferidos

### Phase 4: Polimento

- [ ] Task 9: Script `build` no `package.json`
- [ ] Task 10: `npx biome check .` limpo

### Checkpoint: Completo
- [ ] Todos os critérios de sucesso da spec atendidos
- [ ] Nenhum segredo commitado (`.env` fora do git, `.env.example` só com chaves vazias)
- [ ] Pronto para revisão final

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `DATABASE_URL` real ainda não fornecida | Bloqueia Task 3 e tudo depois | Pauso na Task 3 e peço para você preencher o `.env` local antes de rodar a migration |
| Apps OAuth (Google/Discord) ainda não criados | Bloqueia verificação manual do Checkpoint de Núcleo de autenticação | Código das Tasks 4–6 não depende disso para ser escrito; só a verificação manual espera as credenciais |
| ~~`better-auth` é ESM-first; projeto usa `"type": "commonjs"` + `moduleResolution: NodeNext`~~ | ~~Poderia quebrar import/build~~ | **Resolvido:** confirmado que `better-auth@1.7.1` não tem export CJS (`node_modules/better-auth/package.json`). Você optou por migrar o projeto para `"type": "module"`. Feito na Task 1 — `tsc --noEmit` e `npm run dev` OK. |
| Nomes exatos de hooks/opções do Better Auth podem diferir da versão instalada | Código escrito "de memória" pode não bater com a API real | Nas Tasks 5 e 7, confiro os tipos gerados em `node_modules/better-auth` (fonte de verdade) antes de finalizar, em vez de assumir a API por lembrança |

## Open Questions

Herdadas da spec (não bloqueiam o plano, mas bloqueiam checkpoints específicos):
1. `DATABASE_URL` — necessária antes da Task 3.
2. Credenciais OAuth Google/Discord — necessárias antes do Checkpoint de Núcleo de autenticação.
3. Confirmar se posso adicionar `"build": "tsc"` ao `package.json` (Task 9) — assumido "sim" a menos que você diga o contrário.
