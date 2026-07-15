import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type { CashRegisterDay } from "./cash-register-day.entity";

export interface ListCashRegisterDaysFilter {
  organizationId: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CreateCashRegisterDayInput {
  organizationId: string;
  date: Date;
  openingBalance: string; // valor de entrada, convertido para Decimal só na infraestrutura
  openedByUserId: string;
}

/**
 * Fecha o registro direto para `CLOSED` (dupla conferência removida).
 * `totalIn`/`totalOut`/`closingBalance` são o saldo "contábil" (todas
 * as formas de pagamento, não só dinheiro físico) — antes só calculado
 * na confirmação do handoff; agora é aqui mesmo, já que o fechamento é
 * definitivo.
 */
export interface CloseCashRegisterDayInput {
  expectedCashAmount: string;
  countedAmount: string;
  difference: string;
  totalIn: string;
  totalOut: string;
  closingBalance: string;
  closureNote?: string;
  closedByUserId: string;
  /**
   * Valor do `SafeMovement` `CASH_REGISTER_HANDOFF` criado neste
   * fechamento — `countedAmount` já descontado do que foi confirmado em
   * fechamentos anteriores do mesmo dia (reaberturas). Nunca igual a
   * `countedAmount` num segundo fechamento do mesmo dia, senão a
   * Tesouraria recebe o valor total de novo (bug corrigido).
   */
  handoffAmount: string;
}

export interface ReopenCashRegisterDayInput {
  reopenedByUserId: string;
  reason: string;
}

/**
 * Contrato do repositório de CashRegisterDay. `create()` também escreve
 * no Cofre (`SafeMovement` tipo `FUNDING`, na abertura) na mesma
 * transação — mesmo princípio de atomicidade já usado em
 * `AccountsPayableRepository.markAsPaid` (Coding Standards, item 18.2).
 * O próprio fechamento continua sem dupla conferência (a Secretária
 * fecha sozinha, sem trava) — mas `close()` cria, na mesma transação, um
 * `SafeMovement` `CASH_REGISTER_HANDOFF`/`PENDING` com o dinheiro
 * contado, que só passa a valer no saldo do Cofre depois que um Gerente
 * confirma (`confirm-safe-movement.use-case`).
 */
export interface CashRegisterDayRepository {
  findById(id: string): Promise<CashRegisterDay | null>;

  /** Histórico paginado, ordenado por data desc — usado pelo Relatório de Fechamento Diário. */
  list(
    filter: ListCashRegisterDaysFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<CashRegisterDay>>;

  findByOrganizationAndDate(
    organizationId: string,
    date: Date,
  ): Promise<CashRegisterDay | null>;

  /** Último caixa fechado da organização — usado hoje só pelo fallback de saldo do Dashboard. */
  findLastClosed(organizationId: string): Promise<CashRegisterDay | null>;

  findOpenByOrganization(
    organizationId: string,
  ): Promise<CashRegisterDay | null>;

  /**
   * O `CashRegisterDay` `OPEN` mais ANTIGO com `date` anterior à
   * informada — usado só para bloquear abertura enquanto existir um
   * caixa esquecido de dia anterior (nunca para resolver o alvo de
   * fechamento/sangria, que continuam em `findOpenByOrganization`).
   */
  findOldestOpenBefore(
    organizationId: string,
    date: Date,
  ): Promise<CashRegisterDay | null>;

  /**
   * Cria o dia de caixa e, na mesma transação, retira `openingBalance`
   * do Cofre da organização (`SafeMovement` tipo `FUNDING`) — re-checa
   * saldo suficiente dentro da transação (rede de segurança; a checagem
   * "de verdade" já rodou no use case).
   */
  create(data: CreateCashRegisterDayInput): Promise<CashRegisterDay>;

  close(id: string, data: CloseCashRegisterDayInput): Promise<CashRegisterDay>;

  reopen(
    id: string,
    data: ReopenCashRegisterDayInput,
  ): Promise<CashRegisterDay>;
}
