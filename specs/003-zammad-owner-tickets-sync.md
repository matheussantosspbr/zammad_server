# Spec: Sincronização dos tickets do admin com o Zammad

## Objetivo

Quando o dono do sistema (`OWNER_EMAIL`) é cadastrado e tem seu `ownerId` (id numérico dele no Zammad) definido, um worker assíncrono busca no Zammad todos os tickets onde ele é o `owner_id` (responsável pelo ticket) e salva localmente na tabela `Tickets`. Isso alimenta o dashboard/lista de tickets com dados reais do Zammad em vez do mock atual do frontend.

**Fora de escopo agora (item futuro, "2 customer"):** visibilidade de tickets pelo `customer_id` (quem abriu o ticket) para quando essa pessoa também estiver cadastrada no sistema.

## Contexto técnico

- Endpoint: `GET {ZAMMAD_BASE_URL}/api/v1/tickets/search?condition[ticket.owner_id][operator]=is&condition[ticket.owner_id][value]={ownerId}&expand=true&page={page}&per_page={N}&with_total_count=true`, mesmo header (`Authorization: Token token=...`) com `ZAMMAD_TOKEN` (token de serviço, mesmo do gate de cadastro).
- Resposta: `{ records: ZammadTicket[], total_count: number }` (confirmado pelos prints que você mandou).
- Paginado — mesmo padrão do `listAllUsers`: percorre páginas até vir uma com menos itens que `per_page`.
- Trigger: `databaseHooks.user.create.after` em `auth.ts`, só quando `user.email === env.OWNER_EMAIL` — dispara o worker sem `await` (fire-and-forget), pra não atrasar a resposta do login.

## Modelo de dados

```prisma
model Tickets {
  // ...
  ticketId Int @unique   // adiciona @unique — necessário pro upsert não duplicar
}
```

## Mapeamento de campos

| Campo Zammad | Campo `Tickets` | Observação |
|---|---|---|
| `id` | `ticketId` | |
| `number` | `ticketNumber` | |
| `title` | `title` | |
| `state` | `ticketStatus` | espaço vira `_` (`"pending reminder"` → `pending_reminder`) |
| objeto inteiro | `ticketJson` | |
| — | `userId` | id interno do usuário admin (já conhecido, quem disparou o worker) |

Upsert por `ticketId` (cria se não existe, atualiza `ticketJson`/`ticketStatus`/`title` se já existe).

## Project Structure (arquivos afetados)

```
src/infra/libs/zammad-client.ts          → novo método searchTicketsByOwner(ownerId, token)
src/core/repositories/ticket-repository.ts       → novo (interface)
src/infra/repositories/prisma-ticket-repository.ts → novo (implementação)
src/core/use-cases/sync-owner-tickets.ts          → novo (interface)
src/infra/use-cases/sync-owner-tickets.ts         → novo (implementação)
src/infra/factories/make-sync-owner-tickets-use-case.ts → novo (factory, sem controller/rota — não é HTTP-triggered)
src/infra/libs/auth.ts                    → hook user.create.after novo
prisma/schema.prisma + migration          → @@unique em ticketId
```

## Testing Strategy

Sem test runner (igual specs anteriores). Verificação manual: rodar a sincronização direto via script descartável contra o Zammad real (sabemos que existem tickets reais pro seu `ownerId` 5, pelos prints).

## Boundaries

- **Sempre:** upsert por `ticketId` (nunca duplicar); não bloquear a resposta do login esperando o worker terminar.
- **Nunca:** deixar uma falha do worker (Zammad fora do ar, token inválido) quebrar o cadastro/login do usuário — o worker roda "depois", isolado, com seu próprio try/catch.

## Success Criteria

1. Dono se cadastra (ou já está cadastrado, via script manual) → tickets onde `owner_id` = seu id aparecem na tabela `Tickets`, com os campos mapeados certos.
2. Rodar de novo não duplica — atualiza os mesmos registros (via `ticketId` único).
3. Erro do Zammad durante o worker não derruba nem afeta o login do usuário.

## Open Questions

Nenhuma bloqueante — segui as 4 suposições que declarei antes de começar; corrija se alguma estiver errada.
