# MedFlow — Handoff de Sessão (para retomada no Claude Code)

> Este documento complementa o `CLAUDE.md` (que é a fonte canônica de arquitetura). Aqui está o que a documentação formal não captura: decisões tomadas ao longo do caminho, armadilhas já resolvidas, e o estado exato de onde a sessão anterior parou. Leia isto primeiro ao retomar o projeto.

---

## 1. Onde estamos agora

| Task | Status |
|---|---|
| Task 1 — Bootstrap do projeto | ✅ Concluída |
| Task 2 — Modelagem do banco (schema, migration, seed) | ✅ Concluída |
| Segurança — RLS habilitado, senha reforçada | ✅ Concluída |
| Task 3 — Core (errors, logger, DTOs, validators) | ✅ Concluída |
| Task 4 — Autenticação (login, logout, RBAC, rotas protegidas) | ✅ Concluída |
| Task 5A — Motor financeiro do Fluxo de Caixa (backend completo, 22 testes) | ✅ Concluída |
| **Task 5B — Interface do Fluxo de Caixa** | 🚧 **Próxima etapa** |

**Task 5B, escopo combinado:** consumir as APIs já estáveis da Task 5A (nada de regra de negócio nova). Entregas: tela de abertura de caixa (saldo inicial só no primeiro uso), formulário de lançamento (entrada/saída), tabela de lançamentos do dia (com indicação visual de estornados), botão de estorno com confirmação, botão de fechamento com resumo antes de confirmar, tela/modal de reabertura (só Admin, exige justificativa), estados de loading/erro, responsividade, tema claro/escuro.

Repositório: `github.com/mguimaraesti-dot/medflow`, branch `main`, 9 commits até agora.

---

## 2. Decisões estratégicas que valem lembrar

### Metodologia de trabalho que se consolidou
- **Documentação de arquitetura primeiro, código depois** — mas com disciplina explícita contra "loop infinito de refinamento": em algum ponto a decisão foi "congelar v1.0" e parar de reabrir discussão teórica.
- **Tasks pequenas e verificáveis, uma de cada vez, com aprovação explícita entre elas** — nunca "engatar" implementações em sequência sem checkpoint.
- **Backend (regra de negócio) antes de frontend** — Task 5 foi deliberadamente dividida em 5A (motor financeiro, testado) e 5B (interface, consumindo API estável), exatamente para reduzir retrabalho se uma regra financeira mudar.
- **Cada Task termina com**: resumo do que mudou, estrutura de arquivos, dependências novas, e qualquer decisão técnica que divergiu do combinado — sempre marcado explicitamente, nunca silencioso.

### Documentos-fonte, em ordem de autoridade
1. `CLAUDE.md` (raiz) — contexto canônico, destilado, para qualquer agente de IA.
2. `docs/standards/MedFlow-Coding-Standards.md` — regras de código (nomenclatura, Clean Architecture, DTOs, etc.), incluindo os itens 13-17 (Decimal nunca vaza pro frontend, soft delete proibido em entidades financeiras, isolamento do Prisma, performance, segurança).
3. `docs/sprints/MedFlow-Sprint1-Revisada.md` — histórias de usuário e critérios de aceite da Sprint 1.
4. `docs/roadmap/MedFlow-ROADMAP.md` — o que está fora de escopo de propósito (V1.1, V1.2, V2, V3, Backlog).
5. `docs/decisions/` — ADRs pontuais (troubleshooting de conexão, RLS).

---

## 3. Armadilhas já resolvidas — não repetir a investigação

### Prisma 7 vs 6
O projeto está **fixado em Prisma 6.19.3** (`.npmrc` com `save-exact=true`). O Prisma 7 (lançado nov/2025) quebra o `schema.prisma` clássico (`url`/`directUrl` no datasource passam a exigir `prisma.config.ts` + driver adapters). Isso não está nos Coding Standards aprovados — **não fazer upgrade para v7 sem decisão explícita**. Se `npm install` sem `package.json` travado puxar a v7 por engano, o sintoma é erro `P1012` de schema validation.

### Conexão Supabase — portas do pooler
Erro mais comum enfrentado: confundir qual porta vai em qual variável.
- `DATABASE_URL` → **Transaction pooler, porta 6543**, com `?pgbouncer=true&connection_limit=1` obrigatório (senão erro `prepared statement already exists`).
- `DIRECT_URL` → **Session pooler, porta 5432**, mesmo host do pooler (não usar a conexão direta `db.<projeto>.supabase.co` — exige IPv6, trava com `P1001` em redes sem suporte, que é o caso da rede usada no desenvolvimento).
- Se aparecer `prepared statement "sX" already exists` mesmo com `pgbouncer=true` correto: reiniciar o projeto no Supabase (Settings → General/Infrastructure → Restart project) — geralmente sobra estado de uma tentativa anterior malformada.
- Detalhe completo em `docs/decisions/troubleshooting-supabase-prisma.md`.

### RLS do Supabase
Todas as tabelas têm RLS habilitado **sem nenhuma policy** (migration `20260703160325_enable_row_level_security`). Isso é intencional: a aplicação acessa o Postgres via Prisma com o papel `postgres` (que ignora RLS), então RLS habilitado só bloqueia acesso indevido via API REST/GraphQL automática do Supabase (PostgREST), usando a chave pública. Se algum dia uma feature passar a usar o client Supabase direto do navegador para ler dados (hoje não é o caso), será necessário criar policies explícitas nesse momento — não antes. Detalhe em `docs/decisions/security-rls-and-auth.md`.

### Leaked Password Protection
Fica **bloqueado pelo plano Free do Supabase** (exige Pro). Não é um bug, não precisa investigar de novo — só retomar quando/se o projeto migrar de plano.

### Ambiente de desenvolvimento
- Node/npm rodando em Windows (`C:\Users\Administrador\Documents\medflow`), CMD (não PowerShell) — comandos tipo `copy` em vez de `cp` quando necessário.
- Warnings `Watchpack Error ... DumpStack.log.tmp / pagefile.sys / System Volume Information` no `npm run dev` são inofensivos (Next.js tentando vigiar arquivos de sistema do Windows na raiz do C:\) — não é bug, pode ignorar.
- Fonte do projeto usa o pacote `geist` (local) em vez de `next/font/google`, deliberadamente — decisão tomada para não depender de acesso à Google Fonts em build.

---

## 4. Testes

Vitest configurado (`vitest.config.ts`, alias `@/*` → `./src/*`). Comando: `npm test`.

- **22 testes unitários**, todos passando na máquina real do usuário (2 deles não rodam em ambientes sem Prisma Client gerado, mas isso não é um cenário real de desenvolvimento).
- **1 teste de integração** (`tests/integration/cash-flow-cycle.integration.test.ts`), pulado automaticamente sem `DATABASE_URL_TEST` configurada. **Nunca apontar essa variável para o banco de produção da Clínica MAE** — precisa de um projeto Supabase separado só para teste, ainda não criado.
- Matriz de cenários financeiros da Task 5A (todas cobertas por teste): primeiro uso exige saldo inicial, dia seguinte herda saldo do fechamento anterior, caixa fechado bloqueia lançamento, estorno cria lançamento inverso vinculado, duplo estorno bloqueado, reabertura só Admin com justificativa, reabrir caixa já aberto bloqueado, fechamento sem movimentação preserva saldo.

---

## 5. Convenção de trabalho que funcionou bem nesta sessão

- Toda vez que uma dependência nova era instalada, isso era sinalizado explicitamente no resumo da Task (para saber quando rodar `npm install` de novo vs. só copiar arquivos).
- Toda decisão que divergiu do combinado (ex: adicionar `features/cash-register` como pasta extra na Task 1, ou o repositório de sessão em `core/auth` em vez de passar pelo `UserRepository`) foi justificada explicitamente, nunca silenciosa.
- Regra geral de arquitetura reforçada várias vezes: `organizationId` nunca vem do cliente, sempre da sessão autenticada; `CashFlowEntry` é append-only (nunca update/delete, só create + reverse); Decimal do Prisma nunca cruza para o frontend sem virar string formatada.

---

## 6. Próximo passo imediato

Implementar a Task 5B seguindo exatamente os DTOs e API Routes já existentes em `src/features/cash-register/` e `src/features/cash-flow/` (não inventar novo contrato — a Task 5A já define o formato de entrada/saída de cada endpoint). Usar os primitivos de UI já criados em `src/shared/ui/` (Button, Input, Label, Card) e criar os que faltarem (Table, Dialog, Select) seguindo o mesmo padrão manual do shadcn/ui (a CLI oficial não estava acessível durante o desenvolvimento — vale testar se está acessível no ambiente do Claude Code antes de escrever componentes à mão de novo).
