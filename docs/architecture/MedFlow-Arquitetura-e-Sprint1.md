# MedFlow — Gestão Financeira Inteligente para Clínicas e Consultórios

> Documento de arquitetura, modelagem inicial de dados e planejamento detalhado da Sprint 1.
> Este documento é um artefato vivo: será atualizado a cada Sprint, sem jamais reescrever o que já foi validado.

---

## 1. Visão Geral do Produto

**Nome:** MedFlow
**Proposta de valor:** centralizar o controle financeiro de clínicas médicas (caixa, contas a pagar, fechamento e relatórios) em um sistema moderno, responsivo e auditável, com arquitetura preparada para evoluir para SaaS multiempresa.

**Perfis de usuário (MVP):**
| Perfil | Permissões-chave |
|---|---|
| Administrador | Acesso total, configurações do sistema, gestão de usuários |
| Proprietário | Visão financeira completa, aprovações, relatórios |
| Secretária | Lançamentos operacionais, sem acesso a relatórios sensíveis |
| Financeiro | Fluxo de caixa, contas a pagar, fechamento |
| Contador | Relatórios e exportações, leitura financeira completa |

A modelagem de permissões já nasce como **RBAC (Role-Based Access Control)** com tabela de permissões desacoplada dos papéis fixos, para suportar customização futura por empresa (pré-requisito de SaaS multiempresa).

---

## 2. Decisões Arquiteturais (ADR resumido)

### ADR-001 — Clean Architecture + DDD tático
**Decisão:** o backend (camada de domínio/aplicação) é organizado em 4 camadas independentes de framework:
- **Domain** — entidades, value objects, regras de negócio puras, interfaces de repositório.
- **Application** — casos de uso (use cases), DTOs, orquestração.
- **Infrastructure** — implementações concretas (Prisma, Supabase Auth, Storage).
- **Presentation** — rotas Next.js (API Routes/Route Handlers), controllers, componentes React.

**Motivo:** isola regras de negócio de Supabase/Prisma, permitindo trocar infraestrutura no futuro (ex.: multiempresa, outro provedor de auth) sem tocar no domínio. Facilita testes unitários sem banco de dados real.

### ADR-002 — Next.js 15 (App Router) como monólito modular
**Decisão:** um único projeto Next.js hospeda frontend e as API Routes (Backend for Frontend), consumindo Supabase como backend gerenciado (Postgres + Auth + Storage).
**Motivo:** MVP precisa de velocidade de entrega sem abrir mão de organização. A separação em camadas internas evita acoplamento, então migrar partes para microserviços no futuro é possível sem reescrita total.

### ADR-003 — Prisma como ORM sobre o Postgres do Supabase
**Decisão:** Prisma gerencia schema, migrations e type-safety; Supabase Auth/Storage são acessados via SDK oficial.
**Motivo:** Prisma dá controle total de modelagem relacional, migrations versionadas e índices — mais previsível que depender só do editor SQL do Supabase.

### ADR-004 — Multiempresa desde o modelo de dados (tenant-ready)
**Decisão:** toda tabela de negócio já nasce com `organizationId` (nullable/único no MVP, mas presente), mesmo que o MVP opere com uma única clínica.
**Motivo:** evita migração dolorosa de dados quando o produto virar SaaS. Custo de adicionar a coluna agora é baixíssimo; custo de adicionar depois com dados em produção é alto.

### ADR-005 — Auditoria centralizada
**Decisão:** tabela `AuditLog` genérica (entidade, ação, usuário, payload antes/depois, timestamp, IP) alimentada por um `AuditService` chamado pelos use cases — não por triggers de banco.
**Motivo:** manter a regra de auditoria no domínio/aplicação (testável, explícita) em vez de "mágica" no banco.

### ADR-006 — Identificador público para contas (preparação WhatsApp)
**Decisão:** toda conta a pagar recebe, além do `id` interno (cuid), um `publicToken` (UUID v4, único, indexável) usado futuramente em links de confirmação de pagamento.
**Motivo:** nunca expor o ID interno sequencial/estrutural em links públicos; token opaco e revogável.

### ADR-007 — Validação em camadas com Zod
**Decisão:** Zod valida DTOs na borda (API Route) e reaproveita os mesmos schemas no formulário do frontend (React Hook Form + zodResolver).
**Motivo:** única fonte de verdade para regras de validação, evita divergência frontend/backend.

### ADR-008 — Tema e Design System
**Decisão:** shadcn/ui + Tailwind com tokens de design (CSS variables) para tema claro/escuro, inspirado em Stripe/Notion/Linear/Vercel: tipografia neutra, espaçamento generoso, cor de destaque única, cartões com bordas sutis.
**Motivo:** consistência visual e componentização máxima desde o início, evitando retrabalho de estilo depois.

---

## 3. Estrutura de Diretórios do Projeto

```
medflow/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── src/
│   ├── app/                              # Next.js App Router (Presentation)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── usuarios/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   │   └── route.ts
│   │   │   └── health/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── domain/                           # Camada de Domínio (puro, sem dependências externas)
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   ├── role.entity.ts
│   │   │   └── audit-log.entity.ts
│   │   ├── value-objects/
│   │   │   ├── email.vo.ts
│   │   │   └── password.vo.ts
│   │   ├── repositories/                 # Interfaces (contratos)
│   │   │   ├── user.repository.ts
│   │   │   └── audit-log.repository.ts
│   │   └── errors/
│   │       └── domain-error.ts
│   │
│   ├── application/                      # Casos de uso
│   │   ├── use-cases/
│   │   │   ├── auth/
│   │   │   │   ├── login.use-case.ts
│   │   │   │   └── logout.use-case.ts
│   │   │   └── users/
│   │   │       ├── create-user.use-case.ts
│   │   │       ├── update-user.use-case.ts
│   │   │       ├── list-users.use-case.ts
│   │   │       └── deactivate-user.use-case.ts
│   │   ├── dtos/
│   │   │   ├── create-user.dto.ts
│   │   │   └── login.dto.ts
│   │   └── services/
│   │       └── audit.service.ts
│   │
│   ├── infrastructure/                   # Implementações concretas
│   │   ├── database/
│   │   │   └── prisma.client.ts
│   │   ├── repositories/
│   │   │   ├── prisma-user.repository.ts
│   │   │   └── prisma-audit-log.repository.ts
│   │   ├── auth/
│   │   │   └── supabase-auth.provider.ts
│   │   └── logging/
│   │       └── logger.ts
│   │
│   ├── presentation/
│   │   ├── controllers/
│   │   │   └── user.controller.ts
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rbac.middleware.ts
│   │   │   └── error-handler.middleware.ts
│   │   └── validators/
│   │       └── user.validators.ts
│   │
│   ├── components/                       # React (UI)
│   │   ├── ui/                           # shadcn/ui base
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── forms/
│   │   │   └── user-form.tsx
│   │   └── dashboard/
│   │       ├── kpi-card.tsx
│   │       └── revenue-chart.tsx
│   │
│   ├── hooks/
│   │   ├── use-users.ts
│   │   └── use-auth.ts
│   │
│   ├── lib/
│   │   ├── utils.ts
│   │   ├── query-client.ts
│   │   └── supabase-client.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   └── roles-permissions.ts
│   │
│   └── types/
│       └── index.d.ts
│
├── tests/
│   ├── unit/
│   │   └── use-cases/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Regra de dependência (Clean Architecture):** `presentation` e `infrastructure` dependem de `domain`/`application`; `domain` nunca depende de nada externo. `app/api/*` chama `controllers`, que chamam `use-cases`, que usam interfaces de `domain/repositories`, implementadas em `infrastructure/repositories`.

---

## 4. Modelagem Inicial do Banco de Dados (Prisma)

Escopo desta etapa: entidades necessárias para **Sprint 1** (Login, Dashboard base, Usuários) + fundações que os próximos módulos vão usar (`Organization` para multiempresa, `AuditLog`). As tabelas de Fluxo de Caixa e Contas a Pagar serão detalhadas na Sprint 2/3, mas os relacionamentos já são antecipados nos comentários para não gerar retrabalho.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ------------------------------------------------------
// TENANT (preparação SaaS multiempresa — ADR-004)
// ------------------------------------------------------
model Organization {
  id        String   @id @default(cuid())
  name      String
  cnpj      String?  @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users     User[]

  @@map("organizations")
}

// ------------------------------------------------------
// RBAC
// ------------------------------------------------------
enum RoleName {
  ADMIN
  OWNER
  SECRETARY
  FINANCE
  ACCOUNTANT
}

model Role {
  id          String   @id @default(cuid())
  name        RoleName @unique
  description String?
  permissions Permission[]
  users       User[]

  @@map("roles")
}

model Permission {
  id     String @id @default(cuid())
  key    String @unique // ex: "users:create", "cashflow:read"
  roles  Role[]

  @@map("permissions")
}

// ------------------------------------------------------
// USUÁRIOS
// ------------------------------------------------------
model User {
  id             String       @id @default(cuid())
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])

  name           String
  email          String       @unique
  phone          String?
  avatarUrl      String?

  supabaseAuthId String       @unique   // vínculo com Supabase Auth
  roleId         String
  role           Role         @relation(fields: [roleId], references: [id])

  active         Boolean      @default(true)
  lastLoginAt    DateTime?

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  deletedAt      DateTime?    // soft delete

  auditLogs      AuditLog[]

  @@index([organizationId])
  @@index([roleId])
  @@map("users")
}

// ------------------------------------------------------
// AUDITORIA (ADR-005)
// ------------------------------------------------------
enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  PAYMENT_CONFIRMED
}

model AuditLog {
  id         String      @id @default(cuid())
  userId     String?
  user       User?       @relation(fields: [userId], references: [id])

  entity     String      // ex: "User", "AccountsPayable"
  entityId   String
  action     AuditAction
  before     Json?
  after      Json?
  ipAddress  String?
  userAgent  String?

  createdAt  DateTime    @default(now())

  @@index([entity, entityId])
  @@index([userId])
  @@map("audit_logs")
}

// ------------------------------------------------------
// ANTECIPAÇÃO — Sprint 2/3 (apenas referência, não criado ainda)
// model CashFlowEntry { organizationId, type(IN/OUT), amount, category, ... }
// model AccountsPayable {
//   id, organizationId, publicToken (UUID, ADR-006), payee, amount,
//   dueDate, status(PENDING/PAID/OVERDUE/CANCELLED), pixKey, barcodeNumber, ...
// }
// ------------------------------------------------------
```

**Índices e integridade:**
- `email` e `supabaseAuthId` únicos em `User` (evita duplicidade de login).
- Índices em chaves estrangeiras (`organizationId`, `roleId`) para performance de listagem.
- Soft delete (`deletedAt`) em vez de exclusão física, para manter histórico auditável.
- `AuditLog` indexado por `(entity, entityId)` para consulta rápida do histórico de um registro.

---

## 5. Segurança (fundação aplicada já na Sprint 1)

| Camada | Medida |
|---|---|
| Autenticação | Supabase Auth (e-mail/senha, JWT, refresh token) |
| Autorização | Middleware RBAC validando `role` + tabela `permissions` em cada rota |
| Sessão | Cookies HttpOnly + Secure, expiração configurável |
| Validação | Zod em toda entrada de API (rejeita payload não conforme antes de chegar ao use case) |
| SQL Injection | Mitigado nativamente pelo Prisma (queries parametrizadas) |
| XSS | Sanitização de saída no React (escape automático) + CSP headers |
| CSRF | Tokens de proteção em mutações via API Routes + SameSite cookies |
| Auditoria | Todo CREATE/UPDATE/DELETE/LOGIN passa pelo `AuditService` |

---

## 6. Planejamento Detalhado — Sprint 1

### 6.1 Objetivo
Entregar a fundação do sistema: autenticação funcional, layout base responsivo com tema claro/escuro, CRUD de usuários com RBAC, e um Dashboard inicial (esqueleto, sem dados financeiros ainda — eles chegam na Sprint 2).

### 6.2 Histórias de Usuário

| # | Como... | Eu quero... | Para que... |
|---|---|---|---|
| US01 | Administrador | fazer login com e-mail e senha | acessar o sistema com segurança |
| US02 | Administrador | cadastrar novos usuários e definir seu perfil | controlar quem acessa o sistema e com quais permissões |
| US03 | Administrador | editar e desativar usuários | manter a base de acesso atualizada |
| US04 | Qualquer usuário autenticado | ver um Dashboard inicial | ter uma visão geral do sistema ao entrar |
| US05 | Qualquer usuário | alternar entre tema claro e escuro | usar o sistema com conforto visual |
| US06 | Qualquer usuário | usar o sistema no celular/tablet sem perda de funcionalidade | trabalhar fora do computador |
| US07 | Administrador | consultar o log de auditoria de um usuário | rastrear alterações por segurança |

### 6.3 Critérios de Aceite

**US01 — Login**
- Dado um e-mail e senha válidos, o usuário é autenticado e redirecionado ao Dashboard.
- Dado credenciais inválidas, o sistema exibe erro claro sem revelar se o e-mail existe (proteção contra enumeração).
- Sessão expira após período configurável; refresh automático enquanto houver atividade.
- Tentativas de login são registradas em `AuditLog` (ação `LOGIN`).

**US02/US03 — Cadastro/Edição de Usuários**
- Formulário valida nome, e-mail (único), perfil (obrigatório), telefone (opcional).
- Apenas ADMIN pode criar/editar/desativar usuários (middleware RBAC bloqueia demais perfis com 403).
- Usuário desativado não consegue autenticar, mesmo com credenciais corretas.
- Toda criação/edição gera registro em `AuditLog` com estado antes/depois.

**US04 — Dashboard**
- Layout com sidebar + topbar responsivos, exibindo nome/avatar/perfil do usuário logado.
- Área central com cards "placeholder" (KPIs) prontos para receber dados reais na Sprint 2.

**US05 — Tema**
- Alternância persiste a preferência do usuário (local, sem exigir backend nesta sprint).
- Todos os componentes shadcn/ui respeitam os tokens de tema.

**US06 — Responsividade**
- Sidebar colapsa em menu inferior/drawer em telas < 768px.
- Nenhuma tabela ou formulário quebra layout em viewport de 360px de largura.

**US07 — Auditoria**
- Tela (mesmo que simples) lista os últimos eventos de auditoria de um usuário específico, visível apenas para ADMIN.

### 6.4 Modelo de Dados desta Sprint
Utiliza exatamente as tabelas `Organization`, `Role`, `Permission`, `User`, `AuditLog` definidas na Seção 4. Nenhuma tabela adicional é necessária.

**Seed inicial necessário:**
- 5 `Role` (ADMIN, OWNER, SECRETARY, FINANCE, ACCOUNTANT) com permissões básicas associadas.
- 1 `Organization` padrão (para a clínica atual, já em modo tenant-ready).
- 1 usuário ADMIN inicial (via script `seed.ts`, senha definida por variável de ambiente).

### 6.5 APIs (Route Handlers)

| Método | Rota | Descrição | Perfis permitidos |
|---|---|---|---|
| POST | `/api/auth/login` | Autentica via Supabase Auth, retorna sessão | Público |
| POST | `/api/auth/logout` | Encerra sessão | Autenticado |
| GET | `/api/users` | Lista usuários (paginado, filtros por perfil/status) | ADMIN |
| POST | `/api/users` | Cria usuário | ADMIN |
| GET | `/api/users/:id` | Detalhe do usuário | ADMIN, próprio usuário |
| PUT | `/api/users/:id` | Atualiza usuário | ADMIN |
| PATCH | `/api/users/:id/deactivate` | Desativa usuário | ADMIN |
| GET | `/api/users/:id/audit-logs` | Histórico de auditoria do usuário | ADMIN |
| GET | `/api/health` | Health check (infra) | Público |

Todas as rotas de mutação passam por: `auth.middleware` → `rbac.middleware` → validação Zod (DTO) → `use-case` → `repository` → resposta padronizada `{ data, error }`.

### 6.6 Componentes React (Sprint 1)

```
components/
├── ui/                     → button, input, select, dialog, dropdown-menu,
│                              table, card, badge, avatar, toast (shadcn base)
├── layout/
│   ├── sidebar.tsx         → navegação principal, colapsável
│   ├── topbar.tsx          → busca, avatar, notificações (placeholder)
│   └── theme-toggle.tsx    → alternância claro/escuro
├── forms/
│   ├── login-form.tsx      → RHF + Zod
│   └── user-form.tsx       → criação/edição de usuário, reaproveitado nos dois fluxos
├── users/
│   ├── users-table.tsx     → TanStack Table + paginação
│   └── user-audit-list.tsx
└── dashboard/
    └── kpi-card.tsx        → placeholder para Sprint 2
```

### 6.7 Estrutura de Pastas
Conforme detalhado integralmente na Seção 3 — nenhuma alteração adicional necessária para esta Sprint.

### 6.8 Código
**Ainda não gerado nesta etapa.** Conforme a diretriz do projeto ("sempre apresente a arquitetura antes de gerar código" e "aguardar aprovação antes de iniciar a Sprint"), este documento cobre arquitetura + planejamento. Ao aprovar, inicio a implementação do código da Sprint 1 (schema Prisma real, migrations, use cases, API routes e componentes React) na próxima mensagem.

### 6.9 Testes (planejados)

| Tipo | Cobertura |
|---|---|
| Unitário | Use cases (`create-user`, `login`) com repositórios mockados; value objects (`Email`, `Password`) |
| Integração | API Routes de usuários contra banco de teste (Postgres local/Supabase de staging) |
| E2E | Fluxo completo: login → criar usuário → listar → desativar (Playwright, a definir na Sprint) |

### 6.10 Próximos Passos
1. Você revisa e aprova (ou solicita ajustes) nesta arquitetura, modelagem e plano da Sprint 1.
2. Após aprovação, gero: `schema.prisma` completo + migration inicial, `seed.ts`, use cases, API routes, middlewares e componentes React da Sprint 1, com código completo e testes unitários.
3. Ao final da Sprint 1, faço o checkpoint de qualidade (Clean Code/SOLID) antes de avançarmos para a Sprint 2 (Fluxo de Caixa).

---

## 7. O que ficou definido vs. o que ainda será decidido

**Definido nesta etapa:** arquitetura em camadas, stack, estrutura de pastas, modelo de dados de usuários/RBAC/auditoria, contratos de API da Sprint 1, componentes React da Sprint 1.

**Será decidido em Sprints futuras (não antecipar):** modelo de dados de Fluxo de Caixa e Contas a Pagar (Sprint 2/3), estrutura de relatórios (Sprint 4), regras de fechamento diário (Sprint 5), contrato de integração com WhatsApp (Sprint 6).

---

Aguardo sua aprovação para iniciar a implementação de código da **Sprint 1**, ou ajustes neste plano antes de prosseguir.
