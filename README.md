# MedFlow

Sistema financeiro para clínicas médicas — fluxo de caixa, contas a pagar, dashboard e fechamento diário.

> Contexto completo do projeto: veja [`CLAUDE.md`](./CLAUDE.md) e os documentos em `docs/`.

## Stack

TypeScript · Next.js 15 (App Router) · React 19 · TailwindCSS v4 · shadcn/ui · Prisma · Supabase (Postgres + Auth).

## Status

🚧 **Task 1 concluída** — bootstrap do projeto (infraestrutura base, sem regras de negócio ainda).
Próxima etapa: Task 2 — modelagem do banco (`schema.prisma`, migrations, seed).

## Como rodar localmente

```bash
npm install
cp .env.example .env
# preencha .env com as credenciais do seu projeto Supabase
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

> ⚠️ Neste momento (Task 1) o schema do Prisma não tem modelos ainda — `npx prisma generate`/`migrate` só farão sentido a partir da Task 2. Além disso, os binários de engine do Prisma são baixados de `binaries.prisma.sh` na primeira execução: rode isso em um ambiente com acesso normal à internet.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run format` | Formata o projeto com Prettier |
| `npm run format:check` | Verifica formatação sem alterar arquivos |

## Estrutura de pastas

```
src/
  app/        # rotas Next.js (App Router) — sem regra de negócio
  core/       # infraestrutura e regras transversais (auth, database, errors, logger, permissions, utils)
  shared/     # componentes, hooks e libs reutilizáveis (inclui shared/ui, base do shadcn/ui)
  features/   # cada feature com domain/ application/ infrastructure/ presentation/
prisma/       # schema.prisma, migrations, seed
```

Regras de arquitetura completas: [`MedFlow-Coding-Standards.md`](./docs/standards/MedFlow-Coding-Standards.md).

## Documentação

- [`CLAUDE.md`](./CLAUDE.md) — contexto único do projeto para agentes de IA
- `docs/architecture/` — visão de produto e arquitetura
- `docs/sprints/` — planejamento de cada sprint
- `docs/standards/` — coding standards
- `docs/roadmap/` — roadmap e backlog
- `docs/decisions/` — ADRs (decisões pós-baseline)
