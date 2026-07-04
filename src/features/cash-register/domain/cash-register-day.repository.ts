import type { CashRegisterDay } from "./cash-register-day.entity";

export interface CreateCashRegisterDayInput {
  organizationId: string;
  date: Date;
  openingBalance: string; // valor de entrada, convertido para Decimal só na infraestrutura
  openedByUserId: string;
}

/**
 * Deixa o registro em `PENDING_CONFERENCE`, não mais `CLOSED` direto
 * (Motor de Tesouraria) — a secretária presta contas, a gerência
 * confirma ou rejeita depois.
 */
export interface CloseCashRegisterDayInput {
  expectedCashAmount: string;
  countedAmount: string;
  difference: string;
  closureNote?: string;
  closedByUserId: string;
}

export interface ConfirmHandoffInput {
  receivedAmount: string;
  confirmedDifference: string;
  handoffConfirmedByUserId: string;
  /**
   * `totalIn`/`totalOut`/`closingBalance` são o saldo "contábil" (todas
   * as formas de pagamento, não só dinheiro físico) — mesmo cálculo que
   * antes acontecia em `close()`. Movido para cá porque é só no handoff
   * que o registro realmente vira `CLOSED`; usado hoje só pelo fallback
   * de saldo do Dashboard (`findLastClosed`).
   */
  totalIn: string;
  totalOut: string;
  closingBalance: string;
}

export interface RejectConferenceInput {
  reason: string;
}

export interface ReopenCashRegisterDayInput {
  reopenedByUserId: string;
  reason: string;
}

/**
 * Contrato do repositório de CashRegisterDay. `create()` e
 * `confirmHandoff()` também escrevem no Cofre (`SafeMovement`) na mesma
 * transação — mesmo princípio de atomicidade já usado em
 * `AccountsPayableRepository.markAsPaid` (Coding Standards, item 18.2).
 */
export interface CashRegisterDayRepository {
  findById(id: string): Promise<CashRegisterDay | null>;

  findByOrganizationAndDate(
    organizationId: string,
    date: Date,
  ): Promise<CashRegisterDay | null>;

  /** Último caixa fechado da organização — usado hoje só pelo fallback de saldo do Dashboard. */
  findLastClosed(organizationId: string): Promise<CashRegisterDay | null>;

  findOpenByOrganization(
    organizationId: string,
  ): Promise<CashRegisterDay | null>;

  findPendingConferenceByOrganization(
    organizationId: string,
  ): Promise<CashRegisterDay | null>;

  /**
   * Cria o dia de caixa e, na mesma transação, retira `openingBalance`
   * do Cofre da organização (`SafeMovement` tipo `FUNDING`) — re-checa
   * saldo suficiente dentro da transação (rede de segurança; a checagem
   * "de verdade" já rodou no use case).
   */
  create(data: CreateCashRegisterDayInput): Promise<CashRegisterDay>;

  close(id: string, data: CloseCashRegisterDayInput): Promise<CashRegisterDay>;

  /**
   * Confirma o handoff: muda o status para `CLOSED` e credita o Cofre
   * (`SafeMovement` tipo `CASH_REGISTER_HANDOFF`) na mesma transação —
   * re-checa `status === "PENDING_CONFERENCE"` dentro da transação.
   */
  confirmHandoff(
    id: string,
    data: ConfirmHandoffInput,
  ): Promise<CashRegisterDay>;

  /** Volta o status para `OPEN` — não mexe no Cofre. */
  rejectConference(
    id: string,
    data: RejectConferenceInput,
  ): Promise<CashRegisterDay>;

  reopen(
    id: string,
    data: ReopenCashRegisterDayInput,
  ): Promise<CashRegisterDay>;
}
