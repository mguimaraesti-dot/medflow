import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type {
  SafeMovement,
  SafeMovementType,
  SafeMovementStatus,
} from "./safe-movement.entity";

export interface CreateSafeMovementInput {
  organizationId: string;
  safeId: string;
  type: SafeMovementType;
  amount: string;
  status?: SafeMovementStatus; // default CONFIRMED (Prisma) — só o handoff do fechamento passa PENDING
  relatedCashRegisterDayId?: string;
  performedByUserId: string;
  reason?: string;
}

export interface ListSafeMovementsFilter {
  organizationId: string;
  /** Filtro rápido "Recepção"/"Contas a Pagar"/"Ajustes" — sempre um array, mesmo com 1 tipo. */
  types?: SafeMovementType[];
  status?: SafeMovementStatus;
  createdAtFrom?: Date;
  createdAtTo?: Date;
  relatedCashRegisterDayId?: string;
  /** Busca por descrição (reason) ou nome do responsável. */
  search?: string;
}

export interface DateRangeSignedSum {
  in: string;
  out: string;
}

export interface PendingSummary {
  count: number;
  sum: string;
}

export interface SafeMovementRepository {
  create(data: CreateSafeMovementInput): Promise<SafeMovement>;

  findById(id: string): Promise<SafeMovement | null>;

  list(
    filter: ListSafeMovementsFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<SafeMovement>>;

  /**
   * Usado no fechamento de caixa: com `status: "CONFIRMED"`, descontar
   * sangrias do dia do Dinheiro Esperado (uma sangria cancelada não
   * pode continuar descontando — ver
   * `cancel-confirmed-safe-movement.use-case.ts`) ou somar recolhimentos
   * (`CASH_REGISTER_HANDOFF`) já confirmados pelo Gerente neste dia —
   * inclui reaberturas, já que todas compartilham o mesmo
   * `cashRegisterDayId`. Os dois call sites de `SANGRIA` sempre passam
   * `"CONFIRMED"` explicitamente; `status` continua opcional aqui só
   * porque a assinatura é genérica.
   */
  sumByCashRegisterDayAndType(
    cashRegisterDayId: string,
    type: SafeMovementType,
    status?: SafeMovementStatus,
  ): Promise<string>;

  /** Confirma uma movimentação `PENDING` — só o fechamento de caixa (`CASH_REGISTER_HANDOFF`) chega nesse estado. */
  confirm(id: string, confirmedByUserId: string): Promise<SafeMovement>;

  /**
   * Cancela uma movimentação — exige justificativa. Dois chamadores com
   * pré-condições diferentes (verificadas por eles, não aqui):
   * `cancelSafeMovementUseCase` rejeita uma conferência ainda `PENDING`
   * (nunca afetou o saldo); `cancelConfirmedSafeMovementUseCase` estorna
   * uma `SANGRIA`/`MANUAL_ADJUSTMENT` já `CONFIRMED` (reverte um efeito
   * real no saldo do Cofre).
   */
  cancel(
    id: string,
    cancelledByUserId: string,
    reason: string,
  ): Promise<SafeMovement>;

  /** Busca a(s) movimentação(ões) `PENDING` vinculada(s) a um dia de caixa — usado ao reabrir para auto-cancelar pendências obsoletas. */
  findPendingByCashRegisterDay(
    cashRegisterDayId: string,
  ): Promise<SafeMovement[]>;

  /** Soma de entradas/saídas `CONFIRMED` no intervalo — usado nos cards "Entradas/Saídas do Dia". */
  sumSignedByDateRangeAndStatus(
    organizationId: string,
    from: Date,
    to: Date,
    status: SafeMovementStatus,
  ): Promise<DateRangeSignedSum>;

  /** Só `MANUAL_ADJUSTMENT` `CONFIRMED`, separado por sinal — usado na linha "Ajustes" do Status Report. */
  sumAdjustmentsSignedByDateRange(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<DateRangeSignedSum>;

  /** Contagem + soma de movimentações `PENDING` — card "Pendentes de Confirmação". */
  countAndSumPending(organizationId: string): Promise<PendingSummary>;

  /** Movimentação `CONFIRMED` mais recente que passou por confirmação — card "Última Conferência". */
  findLastConfirmed(organizationId: string): Promise<SafeMovement | null>;
}
