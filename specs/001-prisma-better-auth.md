# Spec: Prisma + Better Auth (Google & Discord) com aprovação manual de usuários

## Objetivo

Adicionar persistência via Prisma e autenticação via Better Auth ao servidor Fastify existente, com:

- Login exclusivamente via **Google** e **Discord** (OAuth social, sem email/senha).
- Todo usuário recém-cadastrado entra com status **PENDING** e **não consegue autenticar** (não recebe sessão) até ser aprovado.
- O **dono do sistema** (você, identificado por email fixo via env var) acessa rotas administrativas para listar usuários pendentes e decidir: **aprovar** ou **bloquear**.
- Usuário aprovado consegue logar normalmente nas próximas tentativas. Usuário bloqueado nunca recebe sessão.

**Fora de escopo nesta spec:** qualquer página web/frontend de administração — apenas a API backend (rotas JSON) é entregue agora.

## Tech Stack

- Fastify 5 + `fastify-type-provider-zod` (já existente)
- **Prisma** (ORM) + **PostgreSQL gerenciado** (Neon/Supabase — você fornece a `DATABASE_URL`)
- **better-auth** (core) com `socialProviders: { google, discord }`
- Adapter oficial `better-auth` ↔ Prisma (`prismaAdapter`)
- `@better-auth/cli` (dev dependency) para gerar o schema Prisma exigido pelo Better Auth

## Modelo de dados (Prisma)

Better Auth exige as tabelas `User`, `Session`, `Account`, `Verification`. Vamos gerá-las com `npx @better-auth/cli generate` e depois estender `User` com o campo de aprovação:

```prisma
enum UserStatus {
  PENDING
  APPROVED
  BLOCKED
}

model User {
  // ...campos gerados pelo better-auth (id, name, email, emailVerified, image, createdAt, updatedAt)
  status UserStatus @default(PENDING)
  // ...relations geradas (sessions, accounts)
}
```

- Novo usuário → `status = PENDING` (default do schema, não precisa de hook para setar).
- Aprovação/bloqueio são apenas updates nesse campo via rota administrativa.

## Regra de bloqueio de sessão

Better Auth expõe `databaseHooks.session.create.before`. Nesse hook:

1. Buscar o `User` correspondente à sessão sendo criada.
2. Se `status !== "APPROVED"` → lançar `APIError("FORBIDDEN", ...)`, abortando a criação da sessão (o login OAuth completa o `Account`/`User`, mas a sessão nunca é emitida, então o usuário nunca "entra").
3. Se `status === "APPROVED"` → segue normalmente.

Isso significa: o registro do `User` é criado no primeiro login social (necessário para aparecer na lista de pendentes), mas ele fica sem sessão válida até aprovação.

## Identidade do "dono"

- Nova env var `OWNER_EMAIL`.
- Middleware `requireOwner` (Fastify `preHandler`): valida sessão do Better Auth e confere se `session.user.email === env.OWNER_EMAIL`. Se não, `403`.
- Sem campo de `role` no banco — a checagem é sempre contra a env var. Simples e evita o problema do "primeiro admin".

## Rotas administrativas (protegidas por `requireOwner`)

| Método | Rota | Ação |
|---|---|---|
| GET | `/admin/users/pending` | Lista usuários com `status = PENDING` |
| POST | `/admin/users/:id/approve` | Seta `status = APPROVED` |
| POST | `/admin/users/:id/block` | Seta `status = BLOCKED` |

Rotas do próprio Better Auth ficam montadas em `/api/auth/*` (catch-all, via `auth.handler` adaptando `FastifyRequest`/`Reply` para `Request`/`Response` padrão Web).

## Variáveis de ambiente (novas, adicionadas ao `.env.example`)

```
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
OWNER_EMAIL=
```

Todas validadas em `src/core/config/env.ts` (mesmo padrão zod já usado para `APPLICATION_PORT`). **Você preenche os valores reais no `.env` local** — não peço para colar segredos na conversa.

## Estrutura de arquivos

```
prisma/
  schema.prisma          → schema gerado pelo better-auth + extensão UserStatus
src/
  infra/libs/
    prisma.ts             → client singleton do Prisma (arquivo já existe, vazio)
    auth.ts                → instância do better-auth (prismaAdapter, socialProviders, databaseHooks)
  presentation/
    middlewares/
      require-owner.ts     → preHandler que valida sessão + email do dono
    routes/
      auth.ts               → catch-all para /api/auth/*
      admin-users.ts         → as 3 rotas administrativas acima
      routes.ts              → registra os módulos acima (já existente, será editado)
.env.example              → novo arquivo, documentando as vars acima
```

## Commands

```
Instalar deps: npm install prisma @prisma/client better-auth
Instalar dev dep: npm install -D @better-auth/cli
Gerar schema better-auth: npx @better-auth/cli generate
Migrar banco: npx prisma migrate dev --name init
Gerar client: npx prisma generate
Dev: npm run dev
Build: npx tsc (via script existente, a confirmar)
```

## Code Style

Seguir o padrão já presente no repo (biome.json): tabs, 4 espaços, aspas duplas, sem ponto-e-vírgula, `noUnusedVariables: error`. Handlers Fastify como `async function`, tipagem via generics do Fastify (`app.get<{ Params: ... }>`), sem `any`.

```ts
app.post<{ Params: { id: string } }>("/admin/users/:id/approve", { preHandler: requireOwner }, async (request, reply) => {
	const user = await prisma.user.update({
		where: { id: request.params.id },
		data: { status: "APPROVED" }
	})
	reply.send(user)
})
```

## Testing Strategy

- Sem framework de teste configurado no repo ainda. **Assunção:** verificação manual via requests (curl/Insomnia) nesta primeira entrega — não vou introduzir um test runner novo dentro desta spec, a menos que você peça.
- Verificação mínima por task: request real contra a API rodando localmente (`npm run dev`), confirmando status code e efeito no banco (`npx prisma studio` ou query direta).

## Boundaries

- **Sempre fazer:** validar env vars via zod antes de subir o servidor; nunca commitar `.env`; seguir o formato de rotas/middlewares já existente no projeto.
- **Perguntar antes:** qualquer mudança de schema além do necessário para Better Auth + `UserStatus`; adicionar novas dependências além de `prisma`, `@prisma/client`, `better-auth`, `@better-auth/cli`.
- **Nunca fazer:** commitar segredos (`DATABASE_URL`, `BETTER_AUTH_SECRET`, client secrets do Google/Discord); permitir emissão de sessão para usuário `PENDING`/`BLOCKED`; expor rotas administrativas sem o `requireOwner`.

## Success Criteria

1. `npx prisma migrate dev` roda sem erro e cria as tabelas do Better Auth + `UserStatus`.
2. Login via Google e via Discord completam o fluxo OAuth e criam um `User` com `status = PENDING`.
3. Usuário `PENDING` que tenta acessar uma rota autenticada recebe erro (sem sessão válida) — confirmado manualmente.
4. `GET /admin/users/pending` (autenticado como `OWNER_EMAIL`) lista o usuário criado no passo 2.
5. `POST /admin/users/:id/approve` muda o status; login subsequente do mesmo usuário gera sessão válida.
6. `POST /admin/users/:id/block` impede sessão mesmo que o usuário já tivesse sido aprovado antes.
7. Qualquer chamada às 3 rotas administrativas por um usuário que não seja `OWNER_EMAIL` retorna `403`.

## Open Questions

1. **`DATABASE_URL` e credenciais OAuth (Google/Discord Client ID/Secret)**: você precisa criar os apps OAuth (Google Cloud Console / Discord Developer Portal) com redirect URI `{BETTER_AUTH_URL}/api/auth/callback/google` e `.../discord`. Eu não tenho como gerar isso — você fornece os valores no `.env` local quando chegarmos na implementação.
2. **Build script**: `package.json` ainda não tem script `build` (só `start`/`dev`). Vou assumir que crio `"build": "tsc"` como parte da implementação, a menos que você já tenha outro plano.
3. Compatibilidade `better-auth` (pacote ESM-first) com `"type": "commonjs"` do projeto + `moduleResolution: NodeNext`: bibliotecas recentes do better-auth publicam dual CJS/ESM, então não espero conflito — mas é um risco técnico que verifico já na primeira task de instalação, não silenciosamente.
