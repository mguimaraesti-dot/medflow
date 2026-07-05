import { NotFoundError } from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "../domain/cash-register-day.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";
import type {
  CashFlowEntryRepository,
  CashFlowEntryInsightProjection,
} from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { SafeMovement } from "@/features/treasury/domain/safe-movement.entity";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
  cashFlowEntryRepository: CashFlowEntryRepository;
  safeMovementRepository: SafeMovementRepository;
}

export interface CashRegisterDayDetail {
  day: CashRegisterDay;
  entries: CashFlowEntryInsightProjection[];
  safeMovements: SafeMovement[];
}

/**
 * Detalhe de um fechamento — "prestação de contas" (ADR de Tesouraria,
 * seção 4.1): o próprio dia + todos os lançamentos + as movimentações
 * do Cofre vinculadas a ele (sangrias/handoff daquele dia).
 */
export async function getCashRegisterDayDetailUseCase(
  id: string,
  organizationId: string,
  deps: Deps,
): Promise<CashRegisterDayDetail> {
  const day = await deps.cashRegisterDayRepository.findById(id);
  if (!day || day.organizationId !== organizationId) {
    throw new NotFoundError("Fechamento de caixa", id);
  }

  const [entries, safeMovements] = await Promise.all([
    deps.cashFlowEntryRepository.listByCashRegisterDay(id),
    deps.safeMovementRepository.list(
      { organizationId, relatedCashRegisterDayId: id },
      { page: 1, pageSize: 100 },
    ),
  ]);

  return { day, entries, safeMovements: safeMovements.items };
}
