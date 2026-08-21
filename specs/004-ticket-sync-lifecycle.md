# Spec: Sincronização persistente de tickets, cron de atualização e auto-fechamento

## Objetivo

Parar de buscar mensagens do Zammad em tempo real a cada acesso — persistir tudo no banco (ticket + mensagens) e mantê-lo atualizado via cron. Além disso, implementar uma rotina de higiene: tickets abertos/pendentes onde a última resposta foi sua e o cliente não respondeu em 1 semana entram numa fila de espera de mais 1 semana antes de serem fechados automaticamente no Zammad — a menos que o cliente responda antes disso.

## Decisões confirmadas com você

1. "1 semana" conta a partir da sua **última resposta** (última mensagem com `sender: Agent`), não do `updated_at` geral do ticket.
2. Enquanto um ticket está "estacionado" (fora da tabela `Tickets`, esperando no Redis), ele **some** da lista/dashboard do app. Volta a aparecer se o cliente responder (restaurado) ou fica `CLOSED` se o prazo vencer.
3. Volume atual (dezenas de tickets) não justifica otimização de chamadas em lote — uma chamada por ticket a cada ciclo do cron está OK.

## Modelo de dados

**Sem coluna nova na tabela `Tickets`.** As mensagens passam a viver dentro do próprio `ticketJson`, como um campo a mais:

```json
{
  "id": 246,
  "number": "88208",
  "...todos os campos originais do Zammad...": "...",
  "messages": [
    {
      "id": "717",
      "author": "agent",
      "authorName": "Carlos Alberto",
      "content": "...",
      "contentType": "text/html",
      "internal": false,
      "createdAt": "2026-08-20T14:42:37.874Z",
      "attachments": [{ "id": "534", "filename": "...", "contentType": "image/png", "url": "/tickets/246/articles/717/attachments/534" }]
    }
  ]
}
```

`messages` já vem no formato mapeado (author/authorName/content/...) que o frontend consome — evita reprocessar a cada leitura.

## Fluxos

### 1. Sincronização inicial (já existe, Fase 9 — só estendida)
`SyncOwnerTicketsUseCase`, disparado uma vez no cadastro do dono (`user.create.after` → fila BullMQ → worker), passa a também buscar as mensagens de cada ticket (`Zammad.getTicketArticles`) e gravar no `ticketJson.messages` — não só os metadados do ticket como hoje.

### 2. Leitura de mensagens (muda de comportamento)
`GET /tickets/:id/messages` deixa de chamar o Zammad ao vivo — lê `ticketJson.messages` direto do banco. Mais rápido, sem limite de rate do Zammad a cada clique.

### 3. Cron de atualização (a cada 30 minutos)
Um BullMQ **repeatable job** (não uma lib de cron nova — reaproveita a fila/worker que já existem) roda a cada 30 min e, pra cada ticket na tabela `Tickets`:
- Busca o ticket + mensagens atuais no Zammad.
- Compara com o que está salvo (status e mensagens).
- Se mudou algo: atualiza a linha (o `updatedAt` do Prisma já bate automaticamente nesse write). Se não mudou nada, não escreve — não força `updatedAt`.
- Depois de atualizar, avalia a regra de auto-fechamento (item 4) pra decidir se o ticket deve ser "estacionado".

O mesmo ciclo do cron também revisita os tickets **estacionados no Redis** (não estão mais na tabela) pra ver se o cliente respondeu — se sim, remove da fila e restaura no banco.

### 4. Auto-fechamento por inatividade do cliente
Condição pra "estacionar" um ticket (avaliada pelo cron, depois de sincronizar):
- `ticketStatus` mapeado é `OPEN` ou `PENDING` (nunca `CLOSED`);
- a última mensagem (`ticketJson.messages` ordenado por data) tem `author: "agent"` (fui eu quem respondeu por último);
- já se passaram ≥ 7 dias desde o `createdAt` dessa última mensagem.

Quando estaciona: a linha inteira do `Tickets` é apagada do banco, e um **delayed job** é criado no Redis (BullMQ, `delay: 7 dias`) carregando um snapshot completo da linha (pra poder restaurar depois).

Se o delay chegar ao fim sem interrupção: o worker chama `PUT {ZAMMAD_BASE_URL}/api/v1/tickets/:id` com `{"state": "closed"}`, fechando o ticket de verdade no Zammad. O job é removido do Redis ao concluir (`removeOnComplete`).

Se durante essa segunda semana o cron detectar que o cliente respondeu (última mensagem deixou de ser `sender: Agent`) ou que o status mudou: remove o delayed job correspondente e restaura a linha no `Tickets` com os dados atualizados — o ticket volta a aparecer normalmente pro usuário.

## Frontend

1. **Card da lista** (`TicketCard`): número do ticket (`ticketNumber`, ex. "88208") ao lado do badge de status; título com truncamento (2 linhas); no lugar do id solto, uma prévia em texto puro (sem HTML) da **primeira mensagem** do ticket; `Atualizado em` continua vindo do `updatedAt` real.
2. **Detalhe do ticket**: onde hoje mostra o id interno, mostrar o `ticketNumber`.
3. **Anexos de imagem**: clique abre a imagem ampliada (lightbox simples, fecha com Escape ou clique fora — mesmo padrão do `ConfirmModal` que já existe).

## Project Structure (arquivos novos/afetados)

```
src/infra/libs/zammad-client.ts        → +getTicket(id), +updateTicketStatus(id, state)
src/infra/use-cases/sync-owner-tickets.ts → busca mensagens também, monta ticketJson.messages
src/infra/use-cases/list-ticket-messages.ts → lê do banco em vez do Zammad
src/infra/queues/sync-tickets-cron-queue.ts → fila do repeatable job
src/infra/queues/auto-close-ticket-queue.ts → fila do delayed job
src/infra/workers/sync-tickets-cron-worker.ts → processa o cron de 30min
src/infra/workers/auto-close-ticket-worker.ts → processa o fechamento ao fim do delay
src/infra/crons/register-sync-tickets-cron.ts → registra o repeatable job (chamado 1x na subida do worker)
src/worker.ts → importa os novos workers + registra o cron
src/presentation/controllers/list-my-tickets-controller.ts → +ticketNumber, +previewMessage no DTO
client/src/components/TicketCard.tsx → layout novo
client/src/components/ui/ImageLightbox.tsx → novo
```

## Boundaries

- **Sempre:** nunca fechar um ticket no Zammad fora do fluxo do delayed job (é uma ação real, irreversível pela API — só o worker de auto-fechamento faz isso); nunca perder dados de um ticket estacionado (o snapshot no Redis precisa ter tudo pra restaurar).
- **Nunca:** rodar o fechamento automático em ticket que já está `CLOSED`; deixar o cron sobrescrever um ticket sem checar se algo realmente mudou (evita `updatedAt` sujo).

## Success Criteria

1. `GET /tickets/:id/messages` não faz mais nenhuma chamada ao Zammad (lê só do banco).
2. Cron roda a cada 30 min e só grava no banco quando há mudança real.
3. Ticket com última resposta minha há mais de 7 dias, ainda aberto/pendente, some da tabela `Tickets` e aparece como delayed job no Redis.
4. Se o cliente responder durante a espera, o ticket volta pro banco e o job some do Redis.
5. Se ninguém responder por 2 semanas no total (1 pra estacionar + 1 de delay), o ticket fecha de verdade no Zammad (`state: closed`).
6. Card da lista mostra número + prévia da primeira mensagem; detalhe mostra número no lugar do id.
7. Clicar numa imagem do chat abre ela ampliada.

## Open Questions

Nenhuma bloqueante — as decisões de escopo já foram confirmadas com você antes desta spec.
