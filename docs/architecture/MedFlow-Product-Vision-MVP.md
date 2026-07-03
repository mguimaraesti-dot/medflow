# MedFlow — Product Vision & MVP

> Versão 1.0 — Documento de negócio que precede e orienta a arquitetura técnica.
> Este documento substitui a visão "arquiteto primeiro" por uma visão "problema do negócio primeiro". A arquitetura já definida (Clean Architecture, Next.js, Supabase, Prisma) permanece válida — o que muda é **o que construímos primeiro e por quê**.

---

## 1. Visão do Produto

**MedFlow** é o sistema financeiro que uma clínica médica abre todo dia, várias vezes ao dia — não uma ferramenta de retaguarda que alguém usa uma vez por mês.

**Princípio orientador:** o sistema gira em torno do *dia* da clínica, não em torno de tabelas do banco de dados. Toda decisão de escopo responde à pergunta: *"isso ajuda a secretária, o financeiro ou o proprietário a passar o dia?"*

**Não-objetivo do MVP:** não é um ERP contábil completo, não substitui o contador, não faz conciliação bancária automática (isso é V2).

---

## 2. Fluxo Operacional da Clínica (o coração do produto)

```
08:00 — Abertura
   Secretária abre o MedFlow
   Dashboard mostra: saldo atual, o que vence hoje, o que foi recebido ontem

08:00–12:00 — Operação da manhã
   Secretária registra recebimentos (consultas, convênios, PIX, cartão)
   Cada recebimento cai no Fluxo de Caixa em tempo real

12:00–14:00 — Contas do dia
   Financeiro lança boletos/despesas que chegaram (Contas a Pagar)
   Sistema identifica o que vence hoje e nos próximos dias

14:00–17:00 — Operação da tarde
   Mais recebimentos são lançados
   Proprietário consulta o Dashboard remotamente (mobile) para ver como está o dia

17:00 — Pagamentos
   Proprietário ou Financeiro paga o que venceu
   Marca a conta como "Paga" → sistema baixa automaticamente do saldo

18:00 — Fechamento
   Fechamento Diário é gerado: saldo inicial, entradas, saídas, saldo final
   Relatório do dia é enviado automaticamente ao proprietário (V2: WhatsApp)

Repete no dia seguinte, com o saldo final de ontem como saldo inicial de hoje.
```

Esse ciclo é o que dá nome às prioridades do MVP abaixo. Login existe porque esse ciclo não pode acontecer sem saber *quem* fez cada lançamento (auditoria e responsabilidade financeira não são negociáveis) — mas login **não é o produto**, é a porta de entrada mínima.

---

## 3. Personas e seus momentos de uso

| Persona | O que faz no MedFlow | Frequência |
|---|---|---|
| **Secretária** | Registra entradas (consultas, convênios), consulta contas do dia | Várias vezes ao dia |
| **Financeiro** | Lança contas a pagar, marca pagamentos, concilia o caixa | Diariamente |
| **Proprietário** | Consulta Dashboard, aprova pagamentos maiores, lê relatórios | Diariamente (muitas vezes via mobile, fora da clínica) |
| **Contador** | Exporta relatórios mensais, consulta fechamentos | Mensalmente |
| **Administrador** | Gerencia usuários e permissões | Raramente |

Nota de priorização: **Secretária e Proprietário usam o sistema todo dia — o MVP deve servir essas duas personas primeiro.** Administrador (gestão de usuários) é a persona de menor frequência de uso e por isso sai da Sprint 1.

---

## 4. Entidades Principais do Domínio Financeiro

Este é o núcleo que faltava no documento de arquitetura. Abaixo, as entidades e como se relacionam — a modelagem Prisma completa será feita no início da Sprint 1 revisada.

```
Organization (clínica — multiempresa futuro)
   │
   ├── BankAccount (conta bancária: banco, agência, conta, saldo)
   │
   ├── CostCenter (centro de custo: Recepção, Consultórios, Lab, Marketing, Adm)
   │
   ├── Category (categoria financeira, com subcategoria)
   │     ├── tipo: RECEITA | DESPESA
   │     └── exemplos: Receita > Consulta / Convênio / PIX
   │                   Despesa > Aluguel / Energia / Material Médico / Salários
   │
   ├── PaymentMethod (Dinheiro, PIX, Cartão Débito/Crédito, Boleto, Transferência)
   │
   ├── Supplier (favorecido/fornecedor — pessoa ou empresa que recebe pagamento)
   │
   ├── CashFlowEntry (lançamento de caixa)
   │     ├── tipo: IN | OUT
   │     ├── amount, date, description
   │     ├── categoryId, costCenterId, paymentMethodId, bankAccountId
   │     └── originId (vínculo opcional com AccountsPayable, quando a saída é baixa de uma conta)
   │
   ├── AccountsPayable (conta a pagar)
   │     ├── publicToken (UUID — link seguro futuro)
   │     ├── supplierId, categoryId, costCenterId
   │     ├── amount, dueDate, description
   │     ├── recurring (boolean) → gera RecurringBill
   │     ├── barcode, digitableLine, pixKey, qrCodeUrl, boletoPdfUrl
   │     ├── status: PENDING | PAID | OVERDUE | CANCELLED
   │     └── paidAt, paidByUserId
   │
   ├── RecurringBill (regra de recorrência: mensal, dia de vencimento, valor-base)
   │
   └── DailyClosing (fechamento diário)
         ├── date, openingBalance, totalIn, totalOut, closingBalance
         ├── closedByUserId
         └── snapshot dos lançamentos do dia (para auditoria histórica)
```

**Decisão de modelagem:** `CashFlowEntry` é a tabela viva (todo dinheiro que entra ou sai passa por ela). `AccountsPayable` é uma *promessa* de saída futura; quando paga, gera um `CashFlowEntry` do tipo `OUT` vinculado a ela via `originId`. Isso evita duplicar lógica de saldo em dois lugares.

---

## 5. Dashboard Conceitual (estilo app bancário)

```
┌─────────────────────────────────────────┐
│  Bom dia, Marcelo 👋                     │
│                                           │
│  Saldo atual                             │
│  R$ 183.452,00                           │
│                                           │
│  ┌───────────────┐  ┌───────────────┐    │
│  │ Receitas hoje │  │ Despesas hoje │    │
│  │ R$ 8.540,00   │  │ R$ 2.100,00   │    │
│  └───────────────┘  └───────────────┘    │
│                                           │
│  Saldo previsto (após contas do dia)     │
│  R$ 190.450,00                           │
│  ─────────────────────────────────────   │
│  Hoje vence (3)                          │
│  ✓ Energia        R$ 480,00              │
│  ✓ Aluguel         R$ 4.200,00           │
│  ✓ Internet        R$ 150,00             │
│  ─────────────────────────────────────   │
│  Fluxo dos últimos 30 dias               │
│  [gráfico de linha/área]                 │
│  ─────────────────────────────────────   │
│  Últimos pagamentos  │  Últimos recebim. │
└─────────────────────────────────────────┘
```

Este Dashboard **é** o Fluxo de Caixa em forma visual — por isso as duas entregas (Dashboard + Fluxo de Caixa) andam juntas na Sprint 1, e não em sprints separadas como no plano original.

---

## 6. Agenda Financeira (novo módulo sugerido pelo revisor)

Timeline do que vence, agrupado por dia, com destaque visual para hoje/atrasado/futuro:

```
Hoje — 02/07
  ● Energia — R$ 480,00 — pendente
  ● Aluguel — R$ 4.200,00 — pendente

Amanhã — 03/07
  ● Internet — R$ 150,00

Atrasado
  ⚠ Fornecedor Material X — R$ 1.200,00 — vencido há 3 dias
```

**Decisão:** este módulo não precisa de tabela nova — é uma *visão* (query agrupada por data) sobre `AccountsPayable`. Entra como parte da tela de Fluxo de Caixa/Dashboard, não como Sprint separada.

---

## 7. Roadmap Revisado do MVP

| Sprint | Entrega | Por quê nessa ordem |
|---|---|---|
| **1** | Login mínimo (1 usuário seed) + Dashboard + **Fluxo de Caixa** (com Categoria, Centro de Custo, Forma de Pagamento, Conta Bancária) | Gera valor real desde o primeiro dia: a clínica já consegue registrar entradas/saídas e ver saldo |
| **2** | Contas a Pagar (Fornecedor, boleto/PIX, recorrência, Agenda Financeira) + Cadastro de Usuários/RBAC completo | Completa o ciclo operacional (o que entra e o que sai) e formaliza controle de acesso |
| **3** | Fechamento Diário + Relatórios (fluxo de caixa, despesas por categoria/favorecido, contas pagas/pendentes) | Consolida o histórico e prepara para o contador |
| **4** | Automação de envio (preparação técnica + confirmação de pagamento via link) — WhatsApp real fica para V2 | Reduz trabalho manual do proprietário |

**V2 (pós-MVP, fora deste roadmap):** conciliação bancária automática, aprovação de pagamento em múltiplos níveis, multiempresa ativado de fato (hoje só a estrutura de dados está pronta), integração real com WhatsApp Business API, plano de contas contábil completo.

---

## 8. O que muda no documento de arquitetura anterior

- **Mantém-se integralmente:** Clean Architecture, camadas, stack, `Organization`/multiempresa, `AuditLog`, RBAC (estrutura de dados), segurança.
- **Sprint 1 é redefinida:** login mínimo (sem UI de cadastro de usuários) + Dashboard + Fluxo de Caixa, no lugar de Login + Dashboard + Usuários.
- **Cadastro de Usuários e RBAC completo** passam para a Sprint 2, junto com Contas a Pagar.
- **Novas entidades entram no escopo do domínio financeiro** desde já: `BankAccount`, `CostCenter`, `Category`, `PaymentMethod`, `Supplier`, `CashFlowEntry`, `AccountsPayable`, `RecurringBill`, `DailyClosing`.

---

## 9. Próximo Passo

Se este documento representa bem o negócio, o próximo passo é eu reescrever a **Sprint 1** (histórias de usuário, critérios de aceite, modelo de dados Prisma completo do domínio financeiro, APIs, componentes React) já alinhada a este roadmap — e então, com sua aprovação, gerar o código.
