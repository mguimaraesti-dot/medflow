import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type { SafeMovement, SafeMovementType } from "./safe-movement.entity";

export interface CreateSafeMovementInput {
  organizationId: string;
  safeId: string;
  type: SafeMovementType;
  amount: string;
  relatedCashRegisterDayId?: string;
  performedByUserId: string;
  reason?: string;
}

export interface ListSafeMovementsFilter {
  organizationId: string;
  type?: SafeMovementType;
  createdAtFrom?: Date;
  createdAtTo?: Date;
}

export interface SafeMovementRepository {
  create(data: CreateSafeMovementInput): Promise<SafeMovement>;

  list(
    filter: ListSafeMovementsFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<SafeMovement>>;

  /** Usado no fechamento de caixa para descontar sangrias do dia do Dinheiro Esperado. */
  sumByCashRegisterDayAndType(
    cashRegisterDayId: string,
    type: SafeMovementType,
  ): Promise<string>;
}
