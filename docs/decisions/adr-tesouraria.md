# ADR — Tesouraria: separar Caixa, Cofre e (futura) Conta Bancária

> Status: **aprovado, pronto para implementação**. Origem: hipótese de melhoria discutida externamente (não é relato de bug em uso real com a Clínica MAE). Revisado e com as 5 perguntas em aberto respondidas — ver Seção 5.

---

## 1. Contexto

O modelo atual (`CashRegisterDay` + `CashFlowEntry`, Sprint 1) trata "caixa" como uma única entidade: abre, recebe lançamentos de qualquer forma de pagamento, fecha com saldo calculado. Isso tem duas limitações que só aparecem quando alguém tenta *conferir dinheiro físico na gaveta*:

1. **PIX não é dinheiro físico** — hoje ele soma no mesmo saldo que Dinheiro, então "quanto tem que ter na gaveta" não bate com o saldo do sistema.
2. **Não existe um lugar permanente pro dinheiro** depois que o caixa fecha — hoje o saldo só "existe" dentro do próprio `CashRegisterDay`, sem um cofre real por trás.

Dado real da operação (confirmado na revisão): hoje a secretária não realiza pagamentos via PIX — isso é feito pelo proprietário/gerente direto pela conta bancária. Ou seja, na prática atual, **toda saída do caixa é em dinheiro**. Mesmo assim, mantemos `PaymentMethod.isCash` desde já, para não precisar alterar a fórmula quando isso mudar.

---

## 2. Decisão

Adotar o modelo de três camadas (Caixa → Cofre → Conta Bancária futura), com dupla conferência humana no fechamento (secretária fecha e presta contas; gerente confere e decide aceitar ou devolver).

### 2.1 Novo ciclo de vida do `CashRegisterDay`

```
OPEN
  │
  │ secretária clica "Fechar caixa" (informa valor contado)
  ▼
PENDING_CONFERENCE
  │
  ├── gerente REJEITA (motivo obrigatório) ──► volta para OPEN
  │
  └── gerente CONFIRMA ──► CLOSED (Cofre creditado, caixa zera)
                              │
                              │ admin reabre (justificativa obrigatória — fluxo já existente)
                              ▼
                             OPEN
```

Três transições, três permissões diferentes:
- `OPEN → PENDING_CONFERENCE`: quem já pode fechar caixa hoje (`cash-register:close`).
- `PENDING_CONFERENCE → OPEN` (rejeição): permissão nova `treasury:reject-conference` — gerente/Admin, não Secretária.
- `PENDING_CONFERENCE → CLOSED` (confirmação): permissão nova `treasury:confirm-handoff` — mesmo público da rejeição.
- `CLOSED → OPEN` (reabertura): já existe, só Admin (`cash-register:reopen`).

### 2.2 Nova feature: `treasury` (não é só tabela nova — é um módulo próprio)

Seguindo a arquitetura feature-first já estabelecida, isto entra como `src/features/treasury/`, não dentro de `cash-register` nem `cash-flow`:

```
features/treasury/
├── domain/
│   ├── safe.entity.ts
│   ├── safe.repository.ts
│   ├── safe-movement.entity.ts
│   └── safe-movement.repository.ts
├── application/
│   ├── dtos/
│   ├── request-sangria.use-case.ts
│   ├── confirm-handoff.use-case.ts
│   ├── reject-conference.use-case.ts
│   └── manual-adjustment.use-case.ts
├── infrastructure/
└── presentation/        (Task 6B — Tela de Tesouraria)
```

`cash-register` e `cash-flow` continuam existindo como estão — a feature `treasury` é quem orquestra a comunicação com o Cofre (abastecimento na abertura, sangria durante o expediente, handoff no fechamento).

### 2.3 Entidades novas

**`Safe`** (Cofre) — uma por organização (1:1, como `OrganizationSettings`). **O saldo não é um campo armazenado como fonte da verdade** — é sempre derivado da soma das movimentações (`SUM(IN) − SUM(OUT)` sobre `SafeMovement`), mesmo princípio já usado em `CashFlowEntry`/`CashRegisterDay` (nunca alterar saldo direto). Se um dia for necessário um campo de cache por performance, ele deve ser tratado explicitamente como cache (recalculável a qualquer momento a partir do ledger), nunca como dado primário.

```prisma
model Safe {
  id             String   @id @default(cuid())
  organizationId String   @unique
  createdAt      DateTime @default(now())
  movements      SafeMovement[]
}
```

**`SafeMovement`** (ledger do cofre — nunca alterar saldo direto, sempre por movimentação, mesma regra de ouro já aplicada em `CashFlowEntry`):
```prisma
enum SafeMovementType {
  FUNDING              // abastecimento do caixa (Cofre -> Caixa)
  SANGRIA              // sangria (Caixa -> Cofre) — nome mantido em português
                       // de propósito: é o termo técnico já usado no Brasil
                       // para essa operação; "WITHDRAWAL" era ambíguo (podia
                       // ser lido como saída de dinheiro do caixa em geral)
  CASH_REGISTER_HANDOFF // fechamento confirmado (Caixa -> Cofre)
  MANUAL_ADJUSTMENT    // só Admin
}

model SafeMovement {
  id                    String   @id @default(cuid())
  organizationId        String
  safeId                String
  type                  SafeMovementType
  amount                Decimal  @db.Decimal(14, 2)
  relatedCashRegisterDayId String? // FK real, nullable
  performedByUserId     String
  reason                String?  // obrigatório para MANUAL_ADJUSTMENT (validado no DTO/use case)
  createdAt             DateTime @default(now())
}
```

Decisão sobre referência genérica (`referenceType`/`referenceId`): **não adotar agora**. Motivo: Postgres não consegue expressar FK polimórfica (uma FK real só aponta pra uma tabela), então isso viraria uma string solta sem integridade garantida pelo banco — inconsistente com o padrão do resto do projeto (toda relação é FK de verdade). Mantemos `relatedCashRegisterDayId` como FK nullable simples. Revisitar **somente quando existir de fato uma segunda origem** de movimentação do cofre.

Decisão sobre `origin`/`destination` como campo separado: **não adotar**. Redundante com `type` (que já expressa a direção de forma semântica — `FUNDING` = Cofre→Caixa, `SANGRIA` = Caixa→Cofre) e criaria risco de os dois campos ficarem inconsistentes entre si.

### 2.4 Campo novo em `PaymentMethod`

```prisma
isCash Boolean @default(false)
```

### 2.5 Campos novos em `CashRegisterDay`

```prisma
expectedCashAmount  Decimal?   // calculado no fechamento
countedAmount       Decimal?   // informado pela SECRETÁRIA ao fechar
receivedAmount      Decimal?   // confirmado pela GERÊNCIA no handoff — pode
                                // divergir de countedAmount (é exatamente
                                // o ponto da dupla conferência: dois números
                                // independentes, não um só compartilhado)
difference          Decimal?   // countedAmount - expectedCashAmount
confirmedDifference Decimal?   // receivedAmount - countedAmount
closureNote         String?
handoffConfirmedByUserId String?
handoffConfirmedAt       DateTime?
rejectedAt               DateTime?
rejectionReason          String?
```

### 2.6 Validação nova — saldo do Cofre na abertura

Como o saldo inicial passa a ser retirado do Cofre, a abertura precisa validar que o Cofre tem saldo suficiente antes de permitir — senão o Cofre fica negativo silenciosamente. Novo erro: `InsufficientSafeBalanceError` (409).

**Implicação para o primeiro uso:** hoje (Sprint 1) o primeiro uso pedia o saldo inicial diretamente ao usuário. No modelo novo, isso só funciona se o Cofre já tiver saldo — ou seja, **antes do primeiro caixa ser aberto, alguém (Admin) precisa fazer um `MANUAL_ADJUSTMENT` inicial no Cofre** (ex: "saldo de abertura da operação: R$ 2.000"), e só depois abrir o primeiro caixa normalmente. Isso substitui a regra antiga de "informar saldo inicial no primeiro uso do sistema" — o conceito de "primeiro uso" migra do Caixa para o Cofre.

### 2.7 Fórmulas (corrigidas)

```
Dinheiro Esperado = Saldo Inicial + Entradas em Dinheiro − Saídas (PaymentMethod.isCash = true) − Sangrias
Total Recebido (KPI, não físico) = Entradas em Dinheiro + Entradas via PIX
```

### 2.8 Fluxos

**Abrir caixa:** saldo inicial passa a ser **retirado do Cofre** (`SafeMovement` tipo `FUNDING`) — substitui a regra de herança automática do fechamento anterior (Sprint 1).

**Sangria:** durante `OPEN`, cria `SafeMovement` (`SANGRIA`) vinculado ao `CashRegisterDay` atual.

**Fechar caixa (secretária):** calcula Dinheiro Esperado; secretária informa Valor Contado (`countedAmount`); sistema calcula Diferença; status vira `PENDING_CONFERENCE`. Cofre **não** é alterado ainda.

**Rejeitar conferência (gerente/Admin):** motivo obrigatório; volta para `OPEN`; nenhuma alteração no Cofre.

**Confirmar handoff (gerente/Admin):** gerência informa o valor efetivamente recebido (`receivedAmount`, pode divergir de `countedAmount`); sistema calcula `confirmedDifference`; cria `SafeMovement` (`CASH_REGISTER_HANDOFF`) com o valor de `receivedAmount`; muda status para `CLOSED`; Cofre creditado.

---

## 3. Impacto no que já existe (Sprint 1, já testado e em produção)

| O que muda | Testes afetados |
|---|---|
| `openCashRegisterUseCase` — saldo inicial vem de retirada do Cofre (com validação de saldo suficiente), não de `findLastClosed()`; "primeiro uso" migra do Caixa para o Cofre (Admin precisa fazer um `MANUAL_ADJUSTMENT` inicial antes do primeiro caixa) | reescreve o teste "herda o closingBalance do último caixa fechado"; novo teste para `InsufficientSafeBalanceError` |
| `closeCashRegisterUseCase` — vai para `PENDING_CONFERENCE`, não `CLOSED` direto | reescrito |
| Novo: `confirmCashRegisterHandoffUseCase` (recebe `receivedAmount`, calcula `confirmedDifference`), `rejectConferenceUseCase`, `requestSangriaUseCase`, `manualAdjustmentUseCase` | novos |
| `reopenCashRegisterUseCase` — continua igual, só a partir de `CLOSED` | sem mudança |
| Migration nova: `Safe`, `SafeMovement`, enum `SafeMovementType`, campos novos em `CashRegisterDay` e `PaymentMethod`, novo valor de enum `PENDING_CONFERENCE` em `CashRegisterStatus` | nova migration |
| Seed: criar o `Safe` da organização (hoje não existe) + marcar `isCash: true` na categoria "Dinheiro" | `prisma/seed.ts` |
| RBAC: `treasury:confirm-handoff`, `treasury:reject-conference`, `treasury:sangria`, `treasury:manual-adjustment` | `roles-permissions.ts` |

---

## 4. Nova tela — Tesouraria (Task 6B, só depois do backend validado)

Menu novo, mostrando: saldo atual do Cofre, últimas sangrias, últimos abastecimentos, últimos handoffs, histórico com filtro por período.

## 4.1 Itens reconhecidos, não implementados agora (vão para Backlog do ROADMAP.md)

- **Número sequencial de identificação do caixa** (ex: `2026-000124`) — útil para suporte/auditoria, mas é UX/relatório, não regra de negócio do motor financeiro. Entra quando a Task 6B (tela) ou a Sprint 3 (Relatórios) forem implementadas.
- **Fechamento parcial / troca de turno** — cenário real em clínicas maiores, mas não validado como necessidade da Clínica MAE agora. Fica documentado como possibilidade futura (V1.2/V2), sem desenhar schema para isso.
- **"Prestação de Contas" do handoff** — isto já é o **Relatório Diário**, que está no Roadmap desde o documento original do MedFlow (Sprint 3 — Relatórios). Não é uma decisão nova; só precisa incorporar os campos novos do Cofre (`countedAmount`, `receivedAmount`, `confirmedDifference`) quando a Sprint 3 chegar.

---

## 5. Perguntas em aberto — respondidas

1. **Saídas só em dinheiro (`isCash = true`)** — ✅ confirmado. Hoje na prática é 100% das saídas, mas o campo já existe para quando isso mudar.
2. **`PENDING_CONFERENCE` é reabilitável antes do handoff?** — ✅ sim, via "Rejeitar Conferência" (gerente/Admin, motivo obrigatório), distinta da Reabertura (Admin, só a partir de `CLOSED`).
3. **Quem confirma o handoff?** — ✅ permissão nova (`treasury:confirm-handoff`), não perfil novo. Owner/Admin certamente; Finance como opcional, a decidir na hora de popular `roles-permissions.ts`. Secretária nunca.
4. **Ajuste manual do Cofre** — ✅ só Admin, motivo obrigatório, sempre via `SafeMovement` (nunca altera saldo direto). **Revisado depois do MVP**: Gerente (`OWNER`) também recebeu `treasury:manual-adjustment` — o perfil não enxergava "Retirada do Cofre" nem "Ajuste Manual" na Tesouraria, e o dono do produto confirmou que deveria ter acesso, junto com Admin.
5. **Conta Bancária** — ✅ não criar tabela agora, só manter documentado no Roadmap.

---

## 6. Princípios contábeis — consolidar, não criar documento novo

Uma revisão sugeriu formalizar regras como "nunca excluir movimentação", "saldo sempre derivado", "estorno sempre gera movimentação inversa" em um documento novo. Concordo com o conteúdo — mas em vez de um ADR dedicado, isso entra como **seção nova (18) no `MedFlow-Coding-Standards.md`**, que já cumpre esse papel de consolidar regra transversal (ver seções 13-17). Criar um documento novo só pra isso duplicaria uma função que já existe, e o projeto já reconheceu, nesta mesma sessão, que documentação em excesso tem retorno decrescente. Ação: ao implementar a Task 6A, adicionar essa seção ao Coding Standards junto com o restante — não antes, não como documento separado.

## 6.1 Consistência transacional e idempotência (regra obrigatória, adicionar ao Coding Standards junto com a 6)

Toda operação que cria `SafeMovement` (abastecimento, sangria, confirmar handoff, rejeitar conferência, ajuste manual) segue o **mesmo padrão já usado em `PrismaCashFlowEntryRepository.reverse()`** (Task 5A):

1. **Uma única transação (`prisma.$transaction`)** por operação — nunca duas escritas relacionadas (ex: criar `SafeMovement` + atualizar `CashRegisterDay.status`) em chamadas separadas ao banco.
2. **A pré-condição de estado é checada de novo dentro da transação**, não só no use case antes de chamar o repositório (ex: "o `CashRegisterDay` ainda está `PENDING_CONFERENCE`?"). É isso que fecha a corrida: um segundo clique quase simultâneo encontra o estado já alterado pelo primeiro (que comitou antes) e falha com erro de domínio — nunca duplica o `SafeMovement`.

**Chave de idempotência (`Idempotency-Key` no header, padrão Stripe)** — reconhecida como boa prática, mas **não obrigatória no MVP**. Protege contra um cenário adicional (retry de rede depois de timeout, cliente não sabe se a primeira tentativa deu certo), que é mais relevante para APIs públicas recebendo tráfego de rede não confiável do que para um sistema interno de uma clínica. Fica documentado como melhoria futura — implementar se/quando um caso real de duplicidade for observado em produção, não preventivamente.

## 7. Recomendação de sequenciamento

1. Terminar Contas a Pagar (Sprint 2) — não interromper.
2. **Task 6A — Motor de Tesouraria**: feature `treasury` completa (schema, migration, use cases, testes unitários cobrindo a mesma disciplina da Task 5A — incluindo os cenários novos: rejeitar conferência, saldo insuficiente no Cofre ao abrir, divergência entre `countedAmount` e `receivedAmount`, e teste de integração simulando duas confirmações de handoff concorrentes para o mesmo caixa — deve gerar `SafeMovement` uma única vez).
3. **Task 6B — Tela de Tesouraria**: só depois do 6A validado com os mesmos critérios usados na Task 5A.

Isso mantém a mesma disciplina que vocês definiram desde o início: nenhuma mudança de arquitetura sem passar por visão → modelagem → aprovação → implementação em Tasks pequenas.
