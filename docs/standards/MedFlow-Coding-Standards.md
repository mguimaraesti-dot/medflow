# MedFlow — Coding Standards

> Versão 1.0 — congelada junto com a arquitetura. Este documento é a referência obrigatória para todas as Sprints a partir de agora. Mudanças aqui exigem decisão consciente, não devem "acontecer" implicitamente durante uma sprint.

---

## 1. Nomenclatura

### Arquivos e pastas
| Tipo | Convenção | Exemplo |
|---|---|---|
| Componente React | `kebab-case.tsx`, export nomeado em `PascalCase` | `cash-flow-entry-form.tsx` → `export function CashFlowEntryForm()` |
| Use case | `verbo-substantivo.use-case.ts` | `create-cash-flow-entry.use-case.ts` |
| Repositório (interface) | `substantivo.repository.ts` | `cash-flow-entry.repository.ts` |
| Repositório (implementação) | `prisma-substantivo.repository.ts` | `prisma-cash-flow-entry.repository.ts` |
| Entidade de domínio | `substantivo.entity.ts` | `cash-flow-entry.entity.ts` |
| DTO | `verbo-substantivo.dto.ts` | `create-cash-flow-entry.dto.ts` |
| Rota Next.js | conforme convenção do App Router | `app/api/cash-flow/route.ts` |
| Teste | mesmo nome do arquivo testado + `.test.ts` / `.spec.ts` | `create-cash-flow-entry.use-case.test.ts` |

### Código
- Classes e tipos: `PascalCase` (`CashFlowEntry`, `CreateCashFlowEntryDTO`).
- Funções e variáveis: `camelCase`.
- Constantes verdadeiramente imutáveis (config, enums-like): `UPPER_SNAKE_CASE`.
- Enums do Prisma: `PascalCase` para o enum, `UPPER_SNAKE_CASE` para os valores (`CashFlowType.IN`).
- Booleans: prefixo `is`/`has`/`can` (`isReversed`, `hasPermission`, `canClose`).
- Nunca abreviar nomes de domínio financeiro (`amount`, não `amt`; `description`, não `desc`).

---

## 2. Organização de Arquivos (reforço da estrutura Feature-First)

- Uma feature nunca importa diretamente de outra feature. Se `dashboard` precisa de dados de `cash-flow`, o contrato passa por um use case exposto e chamado via `core` ou por uma camada de composição em `app/`, nunca por import direto entre pastas de `features/*`.
- Todo arquivo em `domain/` é puro TypeScript — zero import de Prisma, Next.js, React ou Supabase.
- Toda regra de negócio mora em `application/use-cases`, nunca em componentes React nem em `route.ts`. A rota apenas: valida entrada (Zod) → chama use case → formata saída.
- Um use case por arquivo, uma responsabilidade por use case (SRP).

---

## 3. Padrões de Componentes React

- Componentes de apresentação pura (sem fetch, sem use case) ficam livres de lógica de negócio — recebem dados via props.
- Data-fetching via TanStack Query, sempre com hook próprio em vez de chamada solta dentro do componente: `useCashFlowEntries()`, não `useQuery(...)` direto na página.
- Formulários: sempre React Hook Form + Zod, reaproveitando o mesmo schema Zod usado na API (definido uma vez em `application/dtos`, importado dos dois lados).
- Nenhum componente ultrapassa ~200 linhas; se passar, extrair subcomponentes.
- Estado de loading/erro é sempre tratado explicitamente na UI (nunca uma tela "em branco" enquanto carrega).
- Todo componente com mais de um estado visual (ex: aberto/fechado, pago/pendente) usa cores e ícones consistentes com o `color`/`icon` já definidos nas entidades (Category), nunca hardcoded ad-hoc.

---

## 4. Padrões de Uso do Prisma

- Toda query de negócio passa pelo Repository correspondente — nenhum `prisma.*` direto dentro de um use case ou componente.
- `Decimal` do Prisma nunca é convertido para `number` em cálculos financeiros — usar a lib `decimal.js` (já embutida no client do Prisma) para somas/subtrações. Conversão para `number` só acontece na borda de apresentação (formatação de UI).
- Toda tabela de negócio inclui `organizationId` e toda query de listagem filtra por ele — mesmo no MVP de uma clínica só (nunca confiar em "só existe uma organização" como suposição implícita no código).
- `CashFlowEntry` é append-only: repositório não expõe métodos `update`/`delete`, apenas `create` e `findMany`/`findById`. Isso é reforçado no nível do repositório, não só como convenção verbal.

---

## 5. Estratégia de Migrations

- Uma migration por mudança de schema logicamente coesa (não acumular várias mudanças não relacionadas em uma migration).
- Nome da migration descreve o que muda, em inglês, snake_case: `add_color_icon_to_category`, `create_cash_register_day`.
- Migrations nunca são editadas depois de aplicadas em qualquer ambiente compartilhado — correção vira nova migration.
- Toda migration que adiciona coluna `NOT NULL` em tabela já populada precisa de `@default(...)` ou de um passo de backfill explícito documentado no PR.
- `prisma/seed.ts` é idempotente (pode rodar múltiplas vezes sem duplicar dados) — usar `upsert` em vez de `create`.

---

## 6. Tratamento de Erros

- Erros de domínio (regra de negócio violada, ex: "caixa fechado") lançam classes específicas em `core/errors` (`DomainError` e subclasses), nunca `throw new Error("string solta")`.
- `error-handler.middleware` converte `DomainError` em resposta HTTP com status e código semânticos (`400`/`403`/`409` conforme o caso), sempre no formato `{ error: { code, message } }`.
- Nunca expor stack trace ou mensagem de erro do Prisma diretamente ao cliente.

---

## 7. Logs Estruturados

- Todo log usa o `logger` central (`core/logger`), nunca `console.log` solto em código de produção.
- Formato: `{ level, message, context: { userId, organizationId, entity, entityId }, timestamp }`.
- Ações financeiras sensíveis (abrir/fechar/reabrir caixa, estorno) sempre logam em `info`, além de gravar `AuditLog` — são coisas complementares, não substitutas uma da outra.

---

## 8. Convenção de Commits (Conventional Commits)

```
<tipo>(<escopo>): <descrição curta no imperativo>

[corpo opcional explicando o porquê, não o quê]

[rodapé opcional: referência a issue, breaking change]
```

**Tipos:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`.
**Escopo:** o nome da feature (`cash-flow`, `cash-register`, `dashboard`, `auth`, `core`).

Exemplos:
```
feat(cash-flow): adiciona endpoint de estorno de lançamento
fix(cash-register): corrige cálculo de saldo ao reabrir caixa
docs(schema): adiciona color/icon em Category
test(cash-flow): cobre bloqueio de duplo estorno
```

---

## 9. Definition of Done

Uma história de usuário só é considerada concluída quando:

- [ ] Código implementado seguindo Clean Architecture (camada correta para cada responsabilidade).
- [ ] Critérios de aceite da história atendidos e verificados manualmente.
- [ ] Testes unitários cobrindo as regras de negócio do use case.
- [ ] Teste de integração cobrindo a rota de API (quando a história envolve API).
- [ ] Nenhum `console.log`, `any` implícito ou TODO sem issue associada.
- [ ] Ações sensíveis geram `AuditLog` corretamente (validado em teste).
- [ ] Responsivo validado em viewport mobile (360px), tablet e desktop.
- [ ] Tema claro/escuro validado visualmente.
- [ ] Sem regressão em funcionalidade já entregue em sprint anterior.
- [ ] Documentação da Sprint atualizada (se a implementação divergiu do plano aprovado, o motivo é registrado).

---

## 10. Checklist Obrigatório para Pull Requests

- [ ] Título segue Conventional Commits.
- [ ] Descrição do PR referencia a história de usuário (US) correspondente.
- [ ] Diff não mistura mudanças de features diferentes.
- [ ] Nenhuma regra de negócio vazou para componente React ou `route.ts`.
- [ ] Migrations incluídas e nomeadas corretamente, se houver mudança de schema.
- [ ] Testes novos/atualizados incluídos no mesmo PR da funcionalidade.
- [ ] Sem segredo/credencial commitado (`.env` fora do versionamento).
- [ ] Revisor confirma que RBAC foi aplicado nas rotas que exigem permissão específica.

---

## 11. Convenções de Teste

- Testes unitários: `describe(nome do use case) > it(comportamento esperado, em português claro)`.
- Um teste testa um comportamento — evitar `it` gigante cobrindo múltiplos cenários.
- Repositórios são mockados em testes unitários (nunca banco real).
- Testes de integração usam banco de teste isolado (schema/instância separada), nunca o banco de desenvolvimento.
- Nomenclatura de cenário: `should_<resultado_esperado>_when_<condição>` ou frase equivalente em português — manter consistência dentro do projeto (decisão: usar português, alinhado ao domínio de negócio em português).

---

## 12. O que este documento não cobre (fora de escopo por ora)

- CI/CD (pipeline de deploy) — será definido quando o projeto tiver ambiente de staging.
- Estratégia de versionamento de API — irrelevante enquanto houver um único cliente (o próprio frontend Next.js).
- Internacionalização — fora do MVP; todo o domínio é modelado em português (nomes de campos em inglês, textos de UI em português).

---

## 13. Regras Adicionais (Revisão de CTO — v1.0 final)

**13.1 — Decimal nunca cruza a fronteira da API**
O frontend nunca recebe objetos `Decimal` do Prisma. Toda API retorna valores monetários serializados (string ou number formatado) através de DTOs. Conversão `Decimal` → saída acontece exclusivamente na camada `application`/`presentation` ao montar o DTO, nunca no componente React.

**13.2 — Proibido soft delete em entidades financeiras**
`CashFlowEntry`, `CashRegisterDay`, `AccountsPayable` e demais entidades de movimentação nunca usam `deletedAt`. Correção é sempre estorno, cancelamento ou inativação (`active: false` em cadastros como Category/Supplier/PaymentMethod — esses não são "financeiros" no sentido de movimentação, então mantêm o padrão de inativação já definido). `User` é a exceção documentada (soft delete por motivo de integridade referencial de auditoria, não de negócio financeiro).

**13.3 — Migrations nunca exigem limpeza manual em produção**
Toda migration preserva compatibilidade com dados existentes. Coluna nova `NOT NULL` sempre com `@default` ou passo de backfill dentro da própria migration — nunca "instrução em texto para alguém rodar depois".

**13.4 — DTO obrigatório em toda fronteira externa**
Nenhuma entidade de domínio é retornada diretamente por uma API ou recebida diretamente de um formulário. Toda entrada/saída de `route.ts` passa por um DTO com schema Zod correspondente.

**13.5 — Isolamento do Prisma**
Somente arquivos em `infrastructure/` (e `core/database`) podem importar `@prisma/client`. Import de Prisma em `domain/`, `application/` ou `presentation/`/componentes React é violação arquitetural — item de checklist de PR.

**13.6 — Observabilidade mínima em exceções**
Toda exceção não tratada capturada pelo `error-handler.middleware` loga: `requestId`, `userId`, `organizationId`, `timestamp`, rota e nome do use case em execução.

**13.7 — Feature flags: previsto, não implementado**
Não há infraestrutura de feature flags no MVP (complexidade desnecessária para uma organização só). Princípio válido desde já: código experimental não é removido da branch principal sem decisão de produto explícita — fica atrás de condição simples se necessário, não misturado ao fluxo principal.

**13.8 — Convenção HTTP**
`GET` nunca altera estado. `POST` cria. `PUT` atualiza por completo. `PATCH` atualiza parcialmente. `DELETE` **nunca é usado em entidades financeiras** (reforça 13.2) — pode ser usado em cadastros simples sem movimentação associada, se necessário no futuro.

**13.9 — Hooks sempre com prefixo `use` e nome descritivo do verbo**
Padrão: `useCashFlowEntries`, `useCreateCashFlowEntry`, `useCloseCashRegister`, `useDashboardMetrics`. Um hook por operação; hooks de mutação e de leitura não se misturam no mesmo hook.

**13.10 — Padrão de datas**
Banco: sempre UTC. Cálculo de "dia de caixa" (`CashRegisterDay.date`) usa o timezone definido em `OrganizationSettings.timezone`, nunca o timezone do servidor ou do navegador. Exibição na UI: `dd/MM/yyyy`. Payload de API: ISO 8601.

**13.11 — `organizationId` nunca vem do cliente**
Toda rota obtém `organizationId` da sessão autenticada no backend, nunca de um campo do payload enviado pelo frontend, mesmo que pareça redundante. Isso é o que impede vazamento de dado entre organizações no dia em que o multiempresa for ativado de fato.

---

## 14. Princípios de Produto (curto, por definição)

- O sistema existe para facilitar o trabalho da clínica — não o contrário.
- Simplicidade prevalece sobre funcionalidade "bacana" não pedida.
- Nenhuma funcionalidade pode comprometer a integridade financeira do caixa.
- Toda movimentação financeira é rastreável até o usuário que a originou.
- Auditoria não é opcional.
- Mobile é first-class, não um "modo reduzido" do desktop.
- Experiência do usuário pesa tanto quanto arquitetura na hora de decidir algo.

---

## 15. Performance

- Toda listagem é paginada — nenhuma tela carrega mais dados do que o necessário para o que está visível.
- Consultas do Dashboard (saldo, totais do dia/mês, série de 30 dias) são agregadas no backend (query com `SUM`/`GROUP BY` via Prisma), nunca somadas no frontend a partir de uma lista completa.
- Evitar N+1 queries: usar `include`/`select` do Prisma para carregar relações necessárias em uma única query, nunca um loop de queries por item de lista.
- Toda chave usada em filtro ou ordenação frequente (`organizationId`, `cashRegisterDayId`, `dueDate`, `status`) tem índice correspondente no schema.

## 16. Segurança

- Nunca confiar em validação feita só no frontend — toda validação de negócio é reexecutada no backend, mesmo que o formulário já valide.
- Toda autorização (RBAC) é decidida no backend; o frontend só esconde/mostra UI como conveniência, nunca como controle de acesso real.
- Todo endpoint que não é explicitamente público exige sessão autenticada válida.
- Segredos (chaves Supabase, strings de conexão) vivem apenas em variáveis de ambiente, nunca commitados.
- Senhas, tokens e dados sensíveis nunca aparecem em log, mesmo em nível `debug`.

---

## 17. Governança de Mudança

Nenhuma alteração na arquitetura ou nestes Coding Standards será feita até o término da Sprint 2, exceto em caso de bug crítico ou bloqueio técnico real encontrado durante a implementação. Ideias de melhoria que surgirem nesse período vão para o `ROADMAP.md`, não para uma reabertura de discussão arquitetural.

---

Este documento deve ser seguido rigorosamente a partir da implementação da Sprint 1. Qualquer exceção necessária durante uma Sprint deve ser registrada explicitamente (o quê, por quê) em vez de simplesmente divergir em silêncio.

**Status: congelado como v1.0.** Próximas mudanças só a partir de necessidade real identificada em desenvolvimento ou uso, não de nova discussão teórica.
