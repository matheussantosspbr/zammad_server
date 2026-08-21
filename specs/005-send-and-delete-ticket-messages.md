# Spec: Enviar mensagem (com ou sem anexo) e apagar mensagem no ticket

## Objetivo

Hoje o chat do ticket é só leitura — existe até um aviso "Responder por aqui ainda não está disponível". Esta spec adiciona a escrita real: enviar mensagem de texto, enviar mensagem com um ou mais arquivos anexados, e apagar uma mensagem própria dentro de uma janela de 5 minutos. Tudo via API do Zammad, com o token de serviço só no backend (o navegador nunca fala direto com o Zammad).

## Decisões confirmadas com você

1. Toda mensagem enviada pelo app é uma **nota interna fixa**: `content_type: "text/plain"`, `type: "web"`, `internal: true`, `sender: "Agent"` — com ou sem anexo, sempre os mesmos 4 campos. Não é enviada por e-mail ao cliente, só fica visível em quem acessa o Zammad.
2. Upload de anexo: sem limite de tamanho/quantidade de arquivo por enquanto (decisão explícita, não é omissão).
3. Apagar mensagem: botão sempre visível nas suas próprias mensagens; se tentar apagar depois dos 5 minutos, o backend recusa e a UI mostra o erro — sem contagem regressiva no frontend.
4. Depois de enviar ou apagar uma mensagem, o backend re-busca os artigos do ticket no Zammad e atualiza `ticketJson.messages` no banco na hora (mesmo padrão do cron/sync existente) — não espera o cron de 30 min pra refletir a mudança.
5. Enviar/apagar mensagem só funciona se o ticket ainda estiver na tabela `Tickets` local. Se estiver "estacionado" no Redis (fluxo de auto-fechamento da spec 004), a ação é bloqueada com erro claro — consequência natural de o ticket ter saído do banco, não precisa de lógica nova pra isso.

## Endpoints do Zammad usados

### Enviar mensagem (texto)
```
POST {ZAMMAD_BASE_URL}/api/v1/ticket_articles
{
  "ticket_id": 246,
  "body": "teste",
  "content_type": "text/plain",
  "type": "web",
  "internal": true,
  "sender": "Agent"
}
```

### Enviar mensagem com anexo(s)
Mesmo body acima, mais o array `attachments` (um ou mais arquivos):
```json
{
  "ticket_id": 246,
  "body": "Segue o arquivo",
  "content_type": "text/plain",
  "type": "web",
  "internal": true,
  "sender": "Agent",
  "attachments": [
    { "filename": "portal.txt", "data": "VGhlIGNha2UgaXMgYSBsaWUhCg==", "mime-type": "text/plain" }
  ]
}
```
`data` é o conteúdo do arquivo em base64; `mime-type` é o content-type real do arquivo. O backend recebe o arquivo via `multipart/form-data` do navegador e faz essa conversão — o frontend nunca monta esse payload.

### Apagar mensagem
```
DELETE {ZAMMAD_BASE_URL}/api/v1/ticket_articles/:articleId
```
Regras (aplicadas no nosso backend antes de chamar o Zammad):
- A mensagem tem que ser nossa: `sender === "Agent"` no Zammad (mapeado como `author: "user"` no nosso DTO).
- `internal` tem que ser `true`.
- No máximo 5 minutos entre `created_at` da mensagem e o momento da tentativa de apagar.

Essas duas primeiras condições, na prática, só são satisfeitas por mensagens que o próprio app criou (é exatamente a combinação fixa usada no envio) — mas a checagem é feita pelos valores reais salvos, não por "foi enviada pelo app", então cobre qualquer mensagem que já esteja assim no Zammad.

## Tech Stack (adição)

- **`@fastify/multipart`** (nova dependência) — necessário pra receber `multipart/form-data` (texto + arquivos) no Fastify. Sem isso não dá pra receber upload de arquivo do navegador.

## Fluxos

### 1. Enviar mensagem
`POST /tickets/:ticketId/messages`
- `requireAuth`; verifica dono do ticket (`ticket.userId === request.userId`) via `ITicketRepository.findByTicketId` — 404 se não existe ou não é do usuário (mesmo padrão já usado em `list-ticket-messages`).
- Aceita `multipart/form-data`: campo de texto `body` (obrigatório, pode ser string vazia só se tiver ao menos 1 anexo) + campo(s) de arquivo `attachments` (0 ou mais).
- Monta o payload fixo (`content_type`, `type`, `internal`, `sender`) e injeta `ticket_id` + `body` + `attachments` (se houver, cada arquivo convertido pra base64 com seu `mime-type` real).
- `Zammad.createTicketArticle(payload)` → `POST /api/v1/ticket_articles`.
- Depois de criar: `Zammad.getTicket(ticketId)` + `Zammad.getTicketArticles(ticketId)`, remapeia mensagens, faz `upsertByTicketId` no banco (mesmo padrão do `SyncOwnerTicketsUseCase`) — assim o `ticketJson.messages` já reflete a mensagem nova sem esperar o cron.
- Resposta: a lista atualizada de mensagens (`TicketMessageDTO[]`) — o frontend substitui o estado local direto pela resposta, sem precisar de outro round-trip.

### 2. Apagar mensagem
`DELETE /tickets/:ticketId/messages/:messageId`
- `requireAuth`; mesma checagem de dono do ticket.
- Busca a mensagem em `ticketJson.messages` pelo `id`; 404 se não existir.
- Valida `author === "user"` (mapeado de `sender: Agent`) e `internal === true`; 403 se não bater (mensagem não é sua ou não é nota interna).
- Valida `Date.now() - createdAt <= 5 minutos`; 403 com mensagem clara ("Prazo de 5 minutos pra apagar essa mensagem já passou") se estourou.
- `Zammad.deleteTicketArticle(messageId)` → `DELETE /api/v1/ticket_articles/:id`.
- Mesmo passo de re-sincronizar (`getTicket` + `getTicketArticles` + `upsertByTicketId`) pra atualizar o `ticketJson.messages` sem a mensagem apagada.
- Resposta: a lista atualizada de mensagens.

### 3. Frontend — composer real
- Novo `ChatComposer.tsx` (o antigo foi removido na Fase 12 por ser mock — este é novo, funcional): textarea de texto + botão de anexar arquivo (input `type="file"` `multiple`) + botão enviar. Estado de loading desabilita os dois enquanto envia.
- Substitui o aviso fixo "Responder por aqui ainda não está disponível" em `tickets/[id]/page.tsx`.
- Envia via `FormData` (texto + arquivos) pro backend — nunca base64 no cliente.
- Em cada mensagem própria (`author === "user"`) do `ChatMessage.tsx`, um botão de apagar (ícone de lixeira); ao clicar, chama o DELETE e atualiza a lista com a resposta; se der 403 (prazo vencido ou não elegível), mostra a mensagem de erro que veio do backend (reaproveita o tratamento de erro do `http-client.ts` que já propaga a mensagem real, feito na Fase 7).

## Project Structure (arquivos novos/afetados)

```
package.json                                    → +@fastify/multipart
src/server.ts                                   → registra o plugin @fastify/multipart
src/infra/libs/zammad-client.ts                 → +createTicketArticle(payload), +deleteTicketArticle(articleId)
src/core/use-cases/send-ticket-message.ts       → interface ISendTicketMessageUseCase
src/infra/use-cases/send-ticket-message.ts      → implementação (cria artigo + resync)
src/core/use-cases/delete-ticket-message.ts     → interface IDeleteTicketMessageUseCase
src/infra/use-cases/delete-ticket-message.ts    → implementação (valida regras + deleta + resync)
src/presentation/schemas/ticket-message-schema.ts → zod pros params/campos de texto (arquivo vem fora do zod, tratado pelo multipart)
src/presentation/controllers/send-ticket-message-controller.ts
src/presentation/controllers/delete-ticket-message-controller.ts
src/infra/factories/make-send-ticket-message-controller.ts
src/infra/factories/make-delete-ticket-message-controller.ts
src/presentation/routes/tickets.ts              → +POST /tickets/:ticketId/messages, +DELETE /tickets/:ticketId/messages/:messageId
client/src/components/ChatComposer.tsx          → novo (funcional, não mock)
client/src/components/ChatMessage.tsx           → +botão de apagar mensagem própria
client/src/service/tickets-service.ts           → +sendTicketMessage(ticketId, body, files), +deleteTicketMessage(ticketId, messageId)
client/src/store/tickets-store.ts               → +ações de enviar/apagar, atualizando ticket.messages com a resposta
client/src/app/(app)/tickets/[id]/page.tsx      → troca o aviso fixo pelo ChatComposer
```

## Boundaries

- **Sempre:** validar dono do ticket antes de qualquer envio/exclusão (nunca confiar só no `ticketId` da URL); re-sincronizar `ticketJson.messages` depois de qualquer escrita bem-sucedida no Zammad, pra nunca deixar o banco local desatualizado em relação ao que existe de verdade lá.
- **Nunca:** deixar o token do Zammad ou qualquer detalhe da API dele chegar ao navegador; aceitar campos `content_type`/`type`/`internal`/`sender` vindos do cliente (são sempre os valores fixos decididos aqui, nunca parametrizáveis pelo frontend); apagar mensagem que não seja `sender: Agent` + `internal: true`, mesmo que o usuário insista.

## Success Criteria

1. Enviar uma mensagem de texto simples aparece no chat na hora, sem precisar recarregar a página.
2. Enviar uma mensagem com 1+ arquivo funciona e o anexo aparece corretamente no ticket (testado contra um ticket real do Zammad).
3. Tentar apagar uma mensagem de outro autor (`sender: Customer`/`System`) ou uma mensagem não-interna retorna erro, nunca apaga.
4. Apagar dentro de 5 minutos funciona; apagar depois de 5 minutos retorna erro claro, sem apagar.
5. Depois de enviar/apagar, o `ticketJson.messages` no banco já reflete a mudança (não depende do cron de 30 min pra atualizar).
6. Nenhuma chamada do frontend expõe `ZAMMAD_TOKEN` ou fala direto com `ZAMMAD_BASE_URL`.

## Open Questions

Nenhuma bloqueante — as 3 decisões em aberto foram confirmadas com você antes desta spec.
