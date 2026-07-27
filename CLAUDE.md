# CLAUDE.md — MedFlow

> Contexto canônico do projeto para qualquer agente de IA trabalhando no repositório. Este arquivo é uma **destilação** dos documentos já aprovados (Product Vision, Sprint 1, Coding Standards, Roadmap) — não redefine nada, apenas consolida para consulta rápida. Em caso de dúvida de detalhe, os documentos originais em `/docs` são a fonte completa.

**Status: MedFlow v1.0 — baseline congelada.** Nenhuma mudança estrutural sem necessidade real identificada em desenvolvimento/uso.

---

## Commit + push são parte da correção, não um passo separado

Regra geral (a de migration abaixo é um caso específico dela). Vale
para os dois projetos (aqui e relatorio-exames) — incidente aconteceu
lá: um bug de UI foi corrigido, verificado localmente (testes
automatizados + navegador local) e relatado como resolvido, sem commit
nem push. Produção continuou com o código antigo, continuou com o bug,
e só foi corrigida quando o usuário apontou que "funciona local" não é
a mesma coisa que "está corrigido".

"Verificado localmente" e "corrigido" não são sinônimos — o usuário só
vê o que está em produção. Uma correção só está de fato entregue
quando: 1) commit criado; 2) push feito pro `main` remoto; 3) o deploy
gerado a partir desse commit confirmado no ar (`vercel ls`/inspecionar
a URL, ver comando abaixo). Reportar uma correção como concluída antes
disso é a mesma classe de erro que migrar o banco antes do deploy — só
que sem a migration, o sintoma é mais silencioso (nada quebra
imediatamente, o bug antigo simplesmente continua lá) e por isso mais
fácil de deixar passar batido.

## Ordem de deploy — código no ar ANTES de migrar o banco, sempre

Já causou 2 incidentes de produção na mesma sessão (aqui e no
relatorio-exames): rodar `prisma migrate deploy`/qualquer alteração
direta no banco ANTES de o código correspondente estar efetivamente
publicado (`git push` + deploy confirmado no ar, não só commitado
localmente). O banco fica num estado que só o código novo entende; o
código ANTIGO ainda em produção quebra. Ordem correta, sem exceção:
1) commit + push; 2) confirmar o deploy novo no ar (`vercel ls`/
inspecionar a URL); 3) só então rodar a migration contra o banco de
produção.

**Regra específica para migration destrutiva** (`DROP TABLE`/`DROP
COLUMN`/rename de tabela ou coluna/qualquer coisa que o código antigo
ainda consulta): nunca aplicar antes de o código correspondente estar
em produção. Diferença proposital em relação a uma migration aditiva
(nova tabela/coluna nullable) — essa pode ir antes sem risco, porque o
código antigo simplesmente ignora o que não conhece. Uma migration
destrutiva não tem essa margem: o código antigo quebra na hora.

**Checklist obrigatório antes de qualquer `prisma migrate deploy`
contra o banco de produção** (destrutiva ou não):
1. `git status` limpo — nada modificado/untracked que devesse fazer
   parte do que já está no ar.
2. O commit com a mudança correspondente já está no `main` remoto
   (`git log origin/main -1`), não só commitado localmente nem só
   pushado numa branch de feature.
3. O deploy gerado a partir desse commit já está confirmado no ar
   (`vercel ls`/inspecionar a URL) — só então rodar a migration.

**O que os dois incidentes têm em comum, e por que nenhuma suíte de
teste pega isso**: nos dois casos `tsc`, `lint`, os testes e o build
passaram — o código em si estava correto. O que quebrou foi a
diferença entre o código local (testado, correto) e o código
efetivamente publicado no Vercel (antigo, desatualizado). Teste
automatizado roda contra o working tree local; não existe suíte que
verifique se aquele working tree é o mesmo que está no ar. Essa
verificação é o checklist acima, não mais testes.

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

## Acesso ao relatorio-exames — derivado daqui, sem cadastro paralelo

O relatorio-exames (app irmão, mesmo projeto Supabase Auth — login
único) não tem `User`/`Role`/`Permission` próprios. O MedFlow grava
`app_metadata.relatorioPerfil` (`"leitor"` | `"gestor"` | `null`) via
Admin API sempre que um usuário é criado, tem o papel alterado, ou
muda de status (`src/core/integrations/relatorio-exames-sync.ts`,
chamado pelos 3 use-cases de Gestão de Acessos). Mapeamento
(`src/core/permissions/relatorio-perfil.ts`): sem `DASHBOARD_READ` →
`null` (nunca "leitor" por padrão — a Secretária não recebe metadata
nenhum); com `DASHBOARD_READ` e sem `USERS_MANAGE` → `"leitor"`; com
os dois → `"gestor"`. O perfil `"admin"` do relatório nunca é
atribuído automaticamente daqui.

**Não abrir grant nenhum entre os schemas `public` (aqui) e
`relatorio`** para resolver isso de outra forma — foi decisão
deliberada de isolamento (um vazamento da credencial do relatório,
mais exposta, não deve enxergar dados de usuário do MedFlow). O
`relatorio-exames` já existiu com uma tabela própria de autorização
(`usuarios_autorizados`, cadastro manual) — foi removida porque
permitia uma revogação daqui não revogar de verdade lá (a linha manual
sobrevivia independente do papel mudar aqui). Não recriar esse tipo de
mecanismo — ver CLAUDE.md do relatorio-exames, seção "Acesso ao
relatorio-exames", para o raciocínio completo.

Carga inicial e reconciliação (scripts em `scripts/`, mesmo padrão de
`create-test-user.ts`): `sincronizar-acesso-relatorio.ts` roda a
sincronização em todo usuário já existente (uso único, ao adotar este
mecanismo, ou para corrigir divergência); `verificar-acesso-relatorio.ts`
só confere (cruza quem deveria ter acesso com o que está gravado de
verdade), sem corrigir nada — rodar se alguém relatar tela em branco no
relatório antes de investigar mais fundo.

**Consequência maior do que parece**: desativar um usuário aqui (ou
trocar o papel dele pra um sem `DASHBOARD_READ`, ex.: Secretária) já
revoga o acesso aos DOIS sistemas de uma vez — não existe mais um
segundo cadastro pra lembrar de mexer num desligamento. Propagação
CONFIRMADA na prática (não só documentada): `getUser()` do lado do
relatório revalida contra o servidor do Supabase Auth a cada chamada,
então a revogação vale já no próximo carregamento, sem precisar de
logout nem esperar o JWT expirar — verificado por
`scripts/testar-propagacao-revogacao.ts` no repo do relatorio-exames
(cria sessão real, revoga, confere a MESMA sessão sem novo login). Não
existe `admin.signOut(usuarioId)` em lugar nenhum deste fluxo — esse
método do Supabase pede o JWT de uma sessão específica, não um id de
usuário, então não dá pra usar aqui; a propagação não depende disso.

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
