# Spec: Gate de cadastro pelo diretório de usuários do Zammad

## Objetivo

Toda pessoa que se cadastra no sistema (via Google ou Discord) só pode criar conta se o email dela já existir como usuário na instância do Zammad conectada. Se existir, guardamos o `id` numérico desse usuário do Zammad (campo `ownerId`) — é o vínculo entre a conta do nosso sistema e o registro correspondente no Zammad, usado depois para futuras integrações (ex: criar/consultar tickets em nome dessa pessoa). Se não existir, o cadastro é recusado — a conta nem chega a ser criada.

Isso é uma camada adicional ao fluxo de aprovação que já existe (spec 001): bater com o Zammad prova que a pessoa é conhecida, mas **não substitui** a aprovação manual do dono em `/admin/approvals` — ela continua `PENDING` até ser aprovada (decisão confirmada com você), exceto o `OWNER_EMAIL`, que já é auto-aprovado (regra existente).

## Contexto técnico

- Chamada feita com um token de **serviço** (`ZAMMAD_ADMIN_TOKEN`, novo, vive só no `.env` do servidor) — diferente do token pessoal que cada usuário conecta em `/integrations` (aquele fica por conta do próprio usuário, cifrado). Este token de serviço é usado só pelo backend, para listar todos os usuários do Zammad e comparar o email de quem está se cadastrando.
- Endpoint: `GET {ZAMMAD_BASE_URL}/api/v1/users`, mesmo header já usado (`Authorization: Token token=...`).
- **Confirmei na documentação oficial do Zammad (não assumi pelo exemplo de 1 objeto que você mandou): esse endpoint pagina de verdade** (`page`/`per_page`, sem forma de desativar). Vamos percorrer todas as páginas até vir uma página vazia, para não perder usuários que estejam além da primeira página.
- Comparação de email: case-insensitive (emails não diferenciam maiúsculas/minúsculas).

## Modelo de dados

```prisma
model User {
  // ...campos existentes
  ownerId String? @unique   // id numérico do usuário no Zammad, como string
}
```

`ownerId` fica como `String?` (não `Int?`) para manter o mesmo padrão de `discordUserId` — evita conversões e é só um identificador, nunca usado em aritmética.

## Fluxo

No `databaseHooks.user.create.before` do Better Auth (mesmo hook que já auto-aprova o `OWNER_EMAIL`):

1. Busca todos os usuários do Zammad (paginado) usando `ZAMMAD_ADMIN_TOKEN`.
2. Procura um usuário cujo `email` bata (case-insensitive) com o email de quem está se cadastrando.
3. Se achar: segue o cadastro normalmente, com `ownerId` = `String(zammadUser.id)` incluído nos dados do novo usuário (mantendo a lógica já existente de auto-aprovar se for `OWNER_EMAIL`).
4. Se não achar: retorna `false` do hook — o Better Auth não cria o usuário. A pessoa volta pra tela de login com o mesmo aviso genérico que já existe hoje para outros erros de cadastro (`onAPIError.errorURL`).

## Commands

Mesmos do projeto (`npm run dev`, `npx prisma migrate deploy`, `npx tsc --noEmit`, `npx biome check .`).

## Project Structure (arquivos afetados)

```
src/infra/libs/zammad-client.ts         → novo método na classe Zammad (ou uma instância separada com o token de serviço) pra listar/paginar usuários
src/infra/libs/auth.ts                  → hook user.create.before estendido
src/core/config/env.ts                  → nova var ZAMMAD_ADMIN_TOKEN
.env / .env.example                     → nova var
prisma/schema.prisma + migration        → campo ownerId
```

## Code Style

Mesmo padrão do resto do projeto (classes em `/infra/libs`, hooks do Better Auth em `auth.ts`, sem comentários redundantes).

## Testing Strategy

Sem test runner no projeto (igual specs anteriores). Verificação manual: rodar a busca paginada contra o Zammad real via script descartável (`npx tsx --env-file=.env -e "..."`), e testar o hook via um cadastro real depois.

## Boundaries

- **Sempre:** comparar email case-insensitive; percorrer todas as páginas do Zammad antes de decidir que não bateu.
- **Perguntar antes:** mudar a decisão de "ainda precisa de aprovação manual" pra "auto-aprova ao bater com Zammad" (já perguntei e você escolheu manter aprovação manual).
- **Nunca:** logar o `ZAMMAD_ADMIN_TOKEN` ou o corpo completo da resposta do Zammad (pode conter dados pessoais de outros usuários da organização).

## Success Criteria

1. Cadastro com email que existe no Zammad → conta criada, `ownerId` preenchido, status segue a regra de aprovação existente (`PENDING` ou `APPROVED` se for `OWNER_EMAIL`).
2. Cadastro com email que NÃO existe no Zammad → conta não é criada; usuário volta pra tela de login com aviso.
3. Funciona mesmo se o usuário do Zammad estiver em qualquer página (não só a primeira).
4. `ZAMMAD_ADMIN_TOKEN` nunca aparece em logs.

## Open Questions

1. **Token de serviço:** preciso que você gere um token de admin no Zammad (mesmo link de antes: `/#profile/token_access`, mas de uma conta com permissão de listar todos os usuários) e cole em `ZAMMAD_ADMIN_TOKEN` no `.env`. Não tenho como gerar isso.
2. Confirmar se `per_page` que vou usar (100, o mais alto que costuma ser permitido sem erro) é aceito pela sua instância — se o Zammad recusar por exceder o limite configurado, ajusto pra um valor menor.
