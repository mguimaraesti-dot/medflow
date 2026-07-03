# CLAUDE.md — MedFlow

> Contexto canônico do projeto para qualquer agente de IA trabalhando no repositório. Este arquivo é uma **destilação** dos documentos já aprovados (Product Vision, Sprint 1, Coding Standards, Roadmap) — não redefine nada, apenas consolida para consulta rápida. Em caso de dúvida de detalhe, os documentos originais em `/docs` são a fonte completa.

**Status: MedFlow v1.0 — baseline congelada.** Nenhuma mudança estrutural sem necessidade real identificada em desenvolvimento/uso.

---

## O que é o MedFlow

Sistema financeiro para clínicas médicas (Clínica MAE, primeiro cliente). Resolve quatro problemas: Fluxo de Caixa, Contas a Pagar, Dashboard Financeiro, Fechamento Diário + Relatórios. Preparado para virar SaaS multiempresa no futuro, mas o MVP opera com uma única clínica.

**Princípios de produto:**
- O sistema existe para facilitar o trabalho da clínica — não o contrário.
- Simplicidade prevalece sobre funcionalidade não pedida.
- Nenhuma funcionalidade compromete a integridade financeira do caixa.
- Toda movimentação financeira é rastreável até o usuário que a originou.
- Auditoria não é opcional.
- Mobile é first-class.

## Stack

TypeScript em todo o projeto. Next.js 15 (App Router) + React 19 + TailwindCSS + shadcn/ui + React Hook Form + Zod + TanStack Query + Recharts. Backend: Supabase (Auth + Postgres) via Prisma ORM. Deploy: Vercel (frontend) + Supabase (dados). Não há backend separado — API Routes do Next.js fazem esse papel.

## Arquitetura

Clean Architecture + DDD tático, organizada **feature-first**:

```
src/
├── core/        → auth, audit, database, permissions, errors, logger, types (transversal)
├── features/    → cada feature com domain/ application/ infrastructure/ presentation/
├── shared/      → componentes UI, hooks e libs reutilizáveis
└── app/         → só rotas Next.js e composição (nenhuma regra de negócio aqui)
```

Regras invioláveis:
- `domain/` é TypeScript puro — zero import de Prisma, Next.js, React, Supabase.
- Regra de negócio vive em `application/use-cases`, nunca em componente React ou `route.ts`.
- Só `infrastructure/` (e `core/database`) importa `@prisma/client`.
- Uma feature nunca importa de outra feature diretamente.
- `Decimal` do Prisma nunca cruza para o frontend — sempre serializado via DTO.
- `organizationId` sempre vem da sessão autenticada no backend, nunca do payload do cliente.

## Domínio Financeiro — Entidades

`Organization`, `OrganizationSettings`, `User`, `Role`, `Permission`, `AuditLog`, `Category` (com `color`/`icon`/`displayOrder`), `PaymentMethod`, `Supplier`, `CashRegisterDay` (dia de caixa: aberto/fechado, saldo inicial herdado do fechamento anterior), `CashFlowEntry` (append-only, correção via estorno, nunca DELETE), `AccountsPayable`, `RecurringBill`.

Regras de integridade que não mudam:
- Entidades financeiras (`CashFlowEntry`, `CashRegisterDay`, `AccountsPayable`) **nunca** usam soft delete nem exclusão física — correção é sempre estorno/cancelamento.
- `CashFlowEntry` é imutável: sem `update`/`delete` expostos no repositório, só `create` e leitura.
- Estorno cria novo lançamento de sinal oposto, vinculado ao original (`reversalOfEntryId`, `@unique` — um estorno por lançamento).
- Sem `CashRegisterDay` `OPEN` para o dia, não é possível lançar nem estornar.
- Só Admin reabre caixa fechado, com justificativa obrigatória e auditoria.

## Permissões (RBAC)

Perfis: Administrador, Proprietário, Secretária, Financeiro, Contador.
- Secretária: lança entradas/saídas e cadastra contas a pagar, **não** confirma pagamento nem fecha/estorna caixa.
- Financeiro/Proprietário: lançam, estornam, fecham caixa, confirmam pagamento.
- Admin: reabre caixa, gerencia usuários.
- Autorização é sempre decidida no backend; frontend só reflete visualmente.

## Padrões de Código (resumo — detalhe completo em `MedFlow-Coding-Standards.md`)

- Nomenclatura: componentes `kebab-case.tsx`/`PascalCase` export; use case `verbo-substantivo.use-case.ts`; hooks sempre `use...`.
- Formulários: React Hook Form + Zod, schema compartilhado entre frontend e API.
- Erros de domínio são classes em `core/errors`, nunca `throw new Error("string solta")`.
- Log estruturado via `core/logger`, nunca `console.log` solto.
- Commits: Conventional Commits (`feat(cash-flow): ...`).
- `GET` nunca altera estado; `DELETE` nunca é usado em entidade financeira.
- Toda listagem paginada; agregações do Dashboard calculadas no backend, não somadas no frontend.
- Datas: banco em UTC, "dia de caixa" calculado no timezone de `OrganizationSettings`, UI em `dd/MM/yyyy`, API em ISO 8601.
- Testes: unitário para todo use case (repositório mockado); integração para toda rota de API que mexe em dinheiro.

## Definition of Done (resumo)

Uma história só está pronta com: critérios de aceite validados, testes unitário + integração, ações sensíveis gerando `AuditLog`, responsivo (360px/tablet/desktop), tema claro/escuro validado, zero regressão em funcionalidade anterior.

## Escopo do MVP — o que NÃO existe ainda (de propósito)

Controle bancário, conciliação, Open Finance, centro de custos, contas a receber, multiempresa operacional, feature flags implementadas, integração real com WhatsApp (só a preparação: `publicToken` em `AccountsPayable`). Ver `MedFlow-ROADMAP.md` para quando cada item entra.

## Sprints

- **Sprint 1 (atual):** Login mínimo + Abertura/Fechamento de Caixa + Fluxo de Caixa + Dashboard.
- **Sprint 2:** Contas a Pagar completo + Cadastro de Usuários/RBAC completo.
- **Sprint 3:** Fechamento Diário avançado + Relatórios.
- **Sprint 4:** Preparação de automação (WhatsApp real fica para V1.1).

## Governança

Nenhuma mudança de arquitetura ou destes padrões até o fim da Sprint 2, exceto bug crítico ou bloqueio técnico real. Ideia nova → vai para o Backlog do `MedFlow-ROADMAP.md`, não interrompe a sprint em andamento.

## Documentos-fonte completos

`MedFlow-Product-Vision-MVP.md` · `MedFlow-Sprint1-Revisada.md` · `MedFlow-Coding-Standards.md` · `MedFlow-ROADMAP.md`
