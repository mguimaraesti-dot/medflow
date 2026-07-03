# MedFlow — Sprint 1 (Revisada) — Fluxo de Caixa, Caixa Diário e Dashboard

> Incorpora as decisões consolidadas: estrutura feature-first (core/shared/features), saldo inicial herdado do fechamento anterior, lançamentos imutáveis com estorno, controle de caixa aberto/fechado, e segregação entre quem lança e quem confirma pagamento.
> Escopo: **Login mínimo + Abertura/Fechamento de Caixa + Fluxo de Caixa + Dashboard**. Contas a Pagar completo permanece na Sprint 2 (aqui só entra o suficiente do schema para não gerar retrabalho).

---

## 1. Objetivo da Sprint

Colocar a clínica operando o ciclo diário completo dentro do MedFlow: abrir o caixa, registrar entradas/saídas, corrigir erros por estorno, fechar o caixa no fim do dia e visualizar tudo em um Dashboard financeiro — com controle de acesso mínimo (login) e auditoria de cada ação sensível.

---

## 2. Histórias de Usuário

| # | Como... | Eu quero... | Critério de valor |
|---|---|---|---|
| US01 | Qualquer usuário | fazer login | acessar o sistema com segurança |
| US02 | Financeiro/Proprietário/Admin | informar o saldo inicial no primeiro uso do sistema | começar o controle de caixa a partir de um valor real |
| US03 | Secretária/Financeiro/Proprietário | abrir o caixa do dia | começar a registrar lançamentos |
| US04 | Secretária/Financeiro/Proprietário | registrar uma entrada (receita) | refletir o dinheiro recebido no caixa |
| US05 | Secretária/Financeiro/Proprietário | registrar uma saída (despesa) | refletir o dinheiro pago no caixa |
| US06 | Financeiro/Proprietário/Admin | estornar um lançamento incorreto | corrigir erros sem apagar histórico |
| US07 | Financeiro/Proprietário | fechar o caixa do dia | consolidar o resultado e travar o dia contra edições |
| US08 | Administrador | reabrir um caixa já fechado | corrigir algo excepcional, com rastreabilidade total |
| US09 | Qualquer usuário autenticado | ver o Dashboard financeiro | entender a situação do caixa em segundos |
| US10 | Proprietário | ver alertas no topo do sistema | não perder pendências (caixa não fechado, etc.) |

---

## 3. Critérios de Aceite

**US01 — Login**
- Autenticação via Supabase Auth; sessão em cookie HttpOnly/Secure.
- Erro de credenciais não revela se o e-mail existe.
- Toda tentativa (sucesso/falha) gera `AuditLog` (ação `LOGIN`).

**US02 — Saldo inicial (primeiro uso)**
- Se não existir nenhum `CashRegisterDay` para a organização, o sistema exige informar saldo inicial + data antes de liberar qualquer lançamento.
- Essa tela só aparece uma vez na vida do sistema (ou por organização, no futuro multiempresa).
- Perfis permitidos: Financeiro, Proprietário, Administrador. Secretária não pode definir saldo inicial.

**US03 — Abrir caixa**
- Se já existe um `CashRegisterDay` fechado do dia anterior, o saldo inicial do novo dia é **automaticamente** o `closingBalance` do dia anterior — nenhuma digitação manual.
- Não é possível abrir dois `CashRegisterDay` para a mesma data/organização (unicidade).
- Não é possível lançar entradas/saídas sem um caixa `OPEN` para o dia corrente.

**US04/US05 — Registrar entrada/saída**
- Campos obrigatórios: tipo (IN/OUT), valor (> 0), categoria, forma de pagamento, data/hora, descrição opcional.
- Usuário responsável é preenchido automaticamente pela sessão autenticada (nunca editável pelo usuário).
- Só é possível lançar se o `CashRegisterDay` do dia estiver `OPEN`.
- Todo lançamento gera `AuditLog` (ação `CREATE`).
- Saldo do dia e saldo acumulado são recalculados em tempo real (não armazenados como "verdade" até o fechamento — são projeção).

**US06 — Estorno**
- Lançamentos **nunca** são excluídos fisicamente (sem endpoint de DELETE em `CashFlowEntry`).
- Estornar cria um novo `CashFlowEntry` de sinal oposto, vinculado ao original via `reversalOfEntryId`, com descrição automática ("Estorno referente ao lançamento #...") editável.
- O lançamento original é marcado `isReversed = true` e não pode ser estornado novamente.
- Apenas Financeiro, Proprietário e Administrador podem estornar (Secretária não).
- Estorno só é permitido enquanto o `CashRegisterDay` estiver `OPEN`.

**US07 — Fechar caixa**
- Apenas Financeiro ou Proprietário podem fechar (Secretária não; Admin pode em casos de exceção).
- Ao fechar: sistema calcula `totalIn`, `totalOut`, `closingBalance = openingBalance + totalIn - totalOut`, grava no `CashRegisterDay`, muda status para `CLOSED`.
- Após fechado, toda tentativa de criar/estornar lançamento no dia retorna erro explícito ("Caixa fechado. Solicite reabertura a um administrador.").
- Gera `AuditLog` (ação customizada `CASH_REGISTER_CLOSED`).

**US08 — Reabrir caixa**
- Exclusivo para Administrador.
- Reabertura incrementa `reopenCount`, grava `reopenedByUserId`/`reopenedAt`, volta status para `OPEN`.
- Gera `AuditLog` com o motivo (campo obrigatório de justificativa no formulário de reabertura).
- Reabrir não apaga o fechamento anterior — o histórico do fechamento original permanece consultável.

**US09 — Dashboard**
- Exibe: saldo atual, receitas hoje, despesas hoje, resultado do dia, **resultado do mês (receitas − despesas do mês corrente até a data atual)**, últimos lançamentos, gráfico dos últimos 30 dias, status do caixa (aberto/fechado).
- "Próximos vencimentos" aparece como placeholder visual (dado real só na Sprint 2).
- Responsivo: cards empilham em mobile, gráfico se adapta ao viewport.

**US10 — Alertas**
- Banner no topo com alertas relevantes ao perfil logado, por exemplo: "Caixa de hoje ainda não foi aberto", "Caixa de hoje ainda não foi fechado" (exibido a partir de um horário configurável, ex. 18h), "Existem N lançamentos estornados hoje".
- Alertas de contas vencidas ficam preparados no componente mas inativos até a Sprint 2 (sem dado ainda).

---

## 4. Modelagem Prisma Completa do Domínio Financeiro

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// TENANT (estrutural apenas — sem funcionalidade multiempresa na V1)
// ============================================================
model Organization {
  id        String   @id @default(cuid())
  name      String
  cnpj      String?  @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users            User[]
  cashRegisterDays CashRegisterDay[]
  cashFlowEntries  CashFlowEntry[]
  accountsPayable  AccountsPayable[]
  categories       Category[]
  paymentMethods   PaymentMethod[]
  suppliers        Supplier[]
  settings         OrganizationSettings?

  @@map("organizations")
}

// Configurações da clínica — evita espalhar "settings" por várias tabelas
// conforme o sistema cresce (ex: horários usados nos alertas do Dashboard).
model OrganizationSettings {
  id             String       @id @default(cuid())
  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id])

  tradeName      String?      // nome fantasia
  legalName      String?      // razão social
  cnpj           String?
  phone          String?
  whatsapp       String?
  email          String?

  currency       String       @default("BRL")
  timezone       String       @default("America/Sao_Paulo")
  openingTime    String       @default("08:00") // usado no alerta "caixa não aberto"
  closingTime    String       @default("18:00") // usado no alerta "caixa não fechado"

  logoUrl        String?
  primaryColor   String       @default("#0F172A")
  theme          String       @default("system") // "light" | "dark" | "system"

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@map("organization_settings")
}

// ============================================================
// RBAC
// ============================================================
enum RoleName {
  ADMIN
  OWNER
  SECRETARY
  FINANCE
  ACCOUNTANT
}

model Role {
  id          String       @id @default(cuid())
  name        RoleName     @unique
  description String?
  permissions Permission[]
  users       User[]

  @@map("roles")
}

model Permission {
  id    String @id @default(cuid())
  key   String @unique
  // ex: "cashflow:create", "cashflow:reverse", "cash-register:open",
  //     "cash-register:close", "cash-register:reopen",
  //     "payable:create", "payable:pay", "users:manage"
  roles Role[]

  @@map("permissions")
}

model User {
  id             String        @id @default(cuid())
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])

  name           String
  email          String        @unique
  supabaseAuthId String        @unique

  roleId         String
  role           Role          @relation(fields: [roleId], references: [id])

  active         Boolean       @default(true)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  deletedAt      DateTime?

  auditLogs         AuditLog[]
  cashFlowEntries   CashFlowEntry[]     @relation("EntryCreatedBy")
  openedRegisters   CashRegisterDay[]   @relation("RegisterOpenedBy")
  closedRegisters   CashRegisterDay[]   @relation("RegisterClosedBy")
  reopenedRegisters CashRegisterDay[]   @relation("RegisterReopenedBy")

  @@index([organizationId])
  @@map("users")
}

// ============================================================
// AUDITORIA
// ============================================================
enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  REVERSAL
  CASH_REGISTER_OPENED
  CASH_REGISTER_CLOSED
  CASH_REGISTER_REOPENED
  PAYMENT_CONFIRMED
}

model AuditLog {
  id        String      @id @default(cuid())
  userId    String?
  user      User?       @relation(fields: [userId], references: [id])

  entity    String
  entityId  String
  action    AuditAction
  reason    String?     // usado obrigatoriamente em CASH_REGISTER_REOPENED
  before    Json?
  after     Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime    @default(now())

  @@index([entity, entityId])
  @@index([userId])
  @@map("audit_logs")
}

// ============================================================
// CADASTROS FINANCEIROS BASE
// ============================================================
enum CategoryType {
  IN
  OUT
}

model Category {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  name           String
  type           CategoryType
  color          String       @default("#64748B") // hex, usado no Dashboard e nos badges
  icon           String?      // nome do ícone lucide-react (ex: "zap", "home", "wallet")
  displayOrder   Int          @default(0)
  active         Boolean      @default(true)

  cashFlowEntries  CashFlowEntry[]
  accountsPayable  AccountsPayable[]
  recurringBills   RecurringBill[]

  @@unique([organizationId, name, type])
  @@map("categories")
}

model PaymentMethod {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  name           String       // Dinheiro, PIX, Cartão Débito, Cartão Crédito, Boleto, Transferência
  displayOrder   Int          @default(0)
  active         Boolean      @default(true)

  cashFlowEntries CashFlowEntry[]

  @@unique([organizationId, name])
  @@map("payment_methods")
}

model Supplier {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  name           String
  document       String?      // CPF/CNPJ, opcional na Sprint 1
  active         Boolean      @default(true)

  accountsPayable AccountsPayable[]
  recurringBills  RecurringBill[]

  @@index([organizationId])
  @@map("suppliers")
}

// ============================================================
// CAIXA DIÁRIO (novo — controle de abertura/fechamento)
// ============================================================
enum CashRegisterStatus {
  OPEN
  CLOSED
}

model CashRegisterDay {
  id             String              @id @default(cuid())
  organizationId String
  organization   Organization        @relation(fields: [organizationId], references: [id])

  date           DateTime            @db.Date
  status         CashRegisterStatus  @default(OPEN)

  openingBalance Decimal             @db.Decimal(14, 2)
  totalIn        Decimal?            @db.Decimal(14, 2)
  totalOut       Decimal?            @db.Decimal(14, 2)
  closingBalance Decimal?            @db.Decimal(14, 2)

  openedByUserId String
  openedBy       User                @relation("RegisterOpenedBy", fields: [openedByUserId], references: [id])
  openedAt       DateTime            @default(now())

  closedByUserId String?
  closedBy       User?               @relation("RegisterClosedBy", fields: [closedByUserId], references: [id])
  closedAt       DateTime?

  reopenedByUserId String?
  reopenedBy       User?             @relation("RegisterReopenedBy", fields: [reopenedByUserId], references: [id])
  reopenedAt       DateTime?
  reopenCount      Int               @default(0)

  cashFlowEntries CashFlowEntry[]

  @@unique([organizationId, date])
  @@index([organizationId, status])
  @@map("cash_register_days")
}

// ============================================================
// FLUXO DE CAIXA (imutável — correções via estorno)
// ============================================================
enum CashFlowType {
  IN
  OUT
}

model CashFlowEntry {
  id                 String            @id @default(cuid())
  organizationId     String
  organization       Organization      @relation(fields: [organizationId], references: [id])

  cashRegisterDayId  String
  cashRegisterDay    CashRegisterDay   @relation(fields: [cashRegisterDayId], references: [id])

  type               CashFlowType
  amount             Decimal           @db.Decimal(14, 2)
  description        String?
  occurredAt         DateTime          @default(now())

  categoryId         String
  category           Category          @relation(fields: [categoryId], references: [id])

  paymentMethodId    String
  paymentMethod      PaymentMethod     @relation(fields: [paymentMethodId], references: [id])

  // vínculo opcional com Contas a Pagar (usado a partir da Sprint 2)
  accountsPayableId  String?
  accountsPayable    AccountsPayable?  @relation(fields: [accountsPayableId], references: [id])

  createdByUserId    String
  createdBy          User              @relation("EntryCreatedBy", fields: [createdByUserId], references: [id])
  createdAt          DateTime          @default(now())

  // estorno
  isReversed         Boolean           @default(false)
  reversalOfEntryId  String?           @unique
  reversalOfEntry    CashFlowEntry?    @relation("EntryReversal", fields: [reversalOfEntryId], references: [id])
  reversedByEntry    CashFlowEntry?    @relation("EntryReversal")

  @@index([organizationId, cashRegisterDayId])
  @@index([categoryId])
  @@map("cash_flow_entries")
}

// ============================================================
// CONTAS A PAGAR (schema completo agora; feature implementada na Sprint 2)
// ============================================================
enum PayableStatus {
  PENDING
  PAID
  OVERDUE
  CANCELLED
}

model AccountsPayable {
  id             String        @id @default(cuid())
  organizationId String
  organization   Organization  @relation(fields: [organizationId], references: [id])

  publicToken    String        @unique @default(uuid()) // link seguro futuro (WhatsApp)

  supplierId     String
  supplier       Supplier      @relation(fields: [supplierId], references: [id])

  categoryId     String
  category       Category      @relation(fields: [categoryId], references: [id])

  description    String
  amount         Decimal       @db.Decimal(14, 2)
  dueDate        DateTime      @db.Date

  barcode        String?
  digitableLine  String?
  pixKey         String?
  qrCodeUrl      String?
  boletoPdfUrl   String?

  status         PayableStatus @default(PENDING)

  recurringBillId String?
  recurringBill    RecurringBill? @relation(fields: [recurringBillId], references: [id])

  createdByUserId String        // quem cadastrou (ex: Secretária)
  paidByUserId    String?       // quem confirmou o pagamento (Financeiro/Proprietário)
  paidAt          DateTime?

  cashFlowEntries CashFlowEntry[]

  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([organizationId, status])
  @@index([dueDate])
  @@map("accounts_payable")
}

model RecurringBill {
  id             String       @id @default(cuid())
  organizationId String

  supplierId     String
  supplier       Supplier     @relation(fields: [supplierId], references: [id])

  categoryId     String
  category       Category     @relation(fields: [categoryId], references: [id])

  description    String
  amount         Decimal      @db.Decimal(14, 2)
  dueDay         Int          // dia do mês (1–28, evita problema em fevereiro)
  active         Boolean      @default(true)

  payables       AccountsPayable[]

  createdAt      DateTime     @default(now())

  @@map("recurring_bills")
}
```

**Notas de modelagem:**
- `amount` usa `Decimal(14,2)`, nunca `Float` — obrigatório em sistema financeiro para evitar erro de arredondamento.
- `CashFlowEntry` não tem `UPDATE`/`DELETE` exposto na API — só `CREATE` e a rota especial de estorno, que internamente também é um `CREATE`.
- `reversalOfEntryId` é `@unique` para garantir 1:1 (um lançamento só pode ser estornado uma vez).
- `AccountsPayable` e `RecurringBill` entram no schema agora (evita migration disruptiva na Sprint 2), mas nenhuma tela/API deles é construída nesta sprint.

---

## 5. Estrutura de Pastas (Feature-First)

```
src/
├── core/                          # infraestrutura e regras transversais
│   ├── auth/
│   │   ├── supabase-auth.provider.ts
│   │   └── session.ts
│   ├── audit/
│   │   └── audit.service.ts
│   ├── database/
│   │   └── prisma.client.ts
│   ├── permissions/
│   │   ├── roles-permissions.ts
│   │   └── rbac.middleware.ts
│   ├── errors/
│   │   ├── domain-error.ts
│   │   └── error-handler.middleware.ts
│   ├── logger/
│   │   └── logger.ts
│   └── types/
│       └── index.d.ts
│
├── features/
│   ├── auth/
│   │   ├── presentation/
│   │   │   ├── login-form.tsx
│   │   │   └── login.controller.ts
│   │   └── application/
│   │       └── login.use-case.ts
│   │
│   ├── cash-register/              # abrir/fechar/reabrir caixa
│   │   ├── domain/
│   │   │   ├── cash-register-day.entity.ts
│   │   │   └── cash-register-day.repository.ts
│   │   ├── application/
│   │   │   ├── open-cash-register.use-case.ts
│   │   │   ├── close-cash-register.use-case.ts
│   │   │   └── reopen-cash-register.use-case.ts
│   │   ├── infrastructure/
│   │   │   └── prisma-cash-register-day.repository.ts
│   │   └── presentation/
│   │       ├── open-register-modal.tsx
│   │       ├── close-register-button.tsx
│   │       ├── reopen-register-dialog.tsx
│   │       └── cash-register.controller.ts
│   │
│   ├── cash-flow/                  # entradas/saídas + estorno
│   │   ├── domain/
│   │   │   ├── cash-flow-entry.entity.ts
│   │   │   └── cash-flow-entry.repository.ts
│   │   ├── application/
│   │   │   ├── create-cash-flow-entry.use-case.ts
│   │   │   ├── reverse-cash-flow-entry.use-case.ts
│   │   │   └── list-cash-flow-entries.use-case.ts
│   │   ├── infrastructure/
│   │   │   └── prisma-cash-flow-entry.repository.ts
│   │   └── presentation/
│   │       ├── cash-flow-entry-form.tsx
│   │       ├── cash-flow-table.tsx
│   │       ├── reverse-entry-dialog.tsx
│   │       └── cash-flow.controller.ts
│   │
│   └── dashboard/
│       ├── application/
│       │   ├── get-dashboard-summary.use-case.ts
│       │   └── get-dashboard-alerts.use-case.ts
│       └── presentation/
│           ├── dashboard-page.tsx
│           ├── kpi-card.tsx
│           ├── alerts-banner.tsx
│           ├── cash-flow-chart.tsx
│           └── recent-entries-list.tsx
│
├── shared/
│   ├── components/
│   │   ├── ui/                     # shadcn/ui base
│   │   └── layout/
│   │       ├── sidebar.tsx
│   │       ├── topbar.tsx
│   │       └── theme-toggle.tsx
│   ├── hooks/
│   │   └── use-auth.ts
│   └── lib/
│       ├── utils.ts
│       └── query-client.ts
│
└── app/                            # Next.js App Router — só rotas e composição
    ├── (auth)/login/page.tsx
    ├── (dashboard)/
    │   ├── layout.tsx
    │   └── dashboard/page.tsx
    └── api/
        ├── auth/route.ts
        ├── cash-register/
        │   ├── route.ts
        │   ├── close/route.ts
        │   └── reopen/route.ts
        ├── cash-flow/
        │   ├── route.ts
        │   └── [id]/reverse/route.ts
        └── dashboard/
            ├── summary/route.ts
            └── alerts/route.ts
```

`core` e `shared` não conhecem `features`; cada `feature` pode importar de `core`/`shared`, nunca de outra `feature` diretamente (se precisar, o contrato passa por `core`).

---

## 6. APIs da Sprint 1

| Método | Rota | Descrição | Perfis |
|---|---|---|---|
| POST | `/api/auth/login` | Login | Público |
| POST | `/api/cash-register` | Abre o caixa do dia (calcula saldo inicial automaticamente, exceto no 1º uso) | Secretária, Financeiro, Proprietário, Admin |
| GET | `/api/cash-register/today` | Retorna o `CashRegisterDay` do dia corrente + status | Autenticado |
| POST | `/api/cash-register/close` | Fecha o caixa do dia | Financeiro, Proprietário |
| POST | `/api/cash-register/reopen` | Reabre caixa fechado (exige `reason`) | Admin |
| GET | `/api/cash-flow` | Lista lançamentos (paginado, filtro por data/categoria/tipo) | Autenticado |
| POST | `/api/cash-flow` | Cria lançamento (IN/OUT) | Secretária, Financeiro, Proprietário |
| POST | `/api/cash-flow/:id/reverse` | Estorna lançamento | Financeiro, Proprietário, Admin |
| GET | `/api/dashboard/summary` | Saldo atual, receitas/despesas hoje, série 30 dias | Autenticado |
| GET | `/api/dashboard/alerts` | Lista de alertas ativos para o usuário | Autenticado |
| GET | `/api/categories` | Lista categorias (filtro por tipo) | Autenticado |
| GET | `/api/payment-methods` | Lista formas de pagamento | Autenticado |

Todas as mutações passam por: `auth.middleware` → `rbac.middleware` → validação Zod → `use-case` → `repository` → `audit.service` (quando aplicável) → resposta `{ data, error }`.

---

## 7. Componentes React da Sprint 1

```
features/auth/presentation/login-form.tsx
features/cash-register/presentation/
  ├── open-register-modal.tsx      (inclui campo de saldo inicial só no 1º uso)
  ├── close-register-button.tsx    (com confirmação e resumo antes de fechar)
  └── reopen-register-dialog.tsx   (Admin, exige justificativa)
features/cash-flow/presentation/
  ├── cash-flow-entry-form.tsx     (RHF + Zod, tipo IN/OUT, categoria filtrada por tipo)
  ├── cash-flow-table.tsx          (TanStack Table, indica lançamentos estornados)
  └── reverse-entry-dialog.tsx
features/dashboard/presentation/
  ├── dashboard-page.tsx
  ├── kpi-card.tsx
  ├── alerts-banner.tsx            (ícones de alerta, cores por severidade)
  ├── cash-flow-chart.tsx          (Recharts, 30 dias)
  └── recent-entries-list.tsx
shared/components/layout/
  ├── sidebar.tsx
  ├── topbar.tsx
  └── theme-toggle.tsx
```

---

## 8. Testes (planejados)

| Tipo | Cobertura |
|---|---|
| Unitário | `open-cash-register`, `close-cash-register` (cálculo de saldo), `reopen-cash-register` (regras de permissão + auditoria), `create-cash-flow-entry` (validações), `reverse-cash-flow-entry` (garante 1:1, bloqueio de duplo estorno, bloqueio se caixa fechado) |
| Integração | Rotas `/api/cash-register/*` e `/api/cash-flow/*` contra banco de teste — cenário completo: abrir → lançar → estornar → fechar → tentar lançar (deve falhar) → reabrir → lançar |

Testes de integração cobrem o cenário de ponta a ponta descrito acima porque é exatamente aí que mora o risco financeiro (saldo incorreto, lançamento após fechamento, estorno duplicado).

---

## 9. Próximos Passos

1. Aprovação deste plano (schema, estrutura de pastas, APIs, componentes).
2. Implementação do código: `schema.prisma` + migration inicial + seed + use cases + API routes + componentes React + testes unitários e de integração.
   - **Seed (`prisma/seed.ts`)** deverá popular: as 5 `Role` com permissões básicas, 1 `Organization` padrão ("Clínica MAE") com `OrganizationSettings`, 1 usuário `ADMIN` inicial (senha via variável de ambiente), categorias de receita/despesa padrão (com cor/ícone), e as formas de pagamento padrão (com `displayOrder`). Após `npx prisma db seed`, o sistema já deve estar pronto para o primeiro login.
3. Ao final: checkpoint de qualidade (Clean Code/SOLID) e demonstração do ciclo completo (abrir → lançar → estornar → fechar → dashboard) antes de avançar para a Sprint 2 (Contas a Pagar completo + Usuários/RBAC).
