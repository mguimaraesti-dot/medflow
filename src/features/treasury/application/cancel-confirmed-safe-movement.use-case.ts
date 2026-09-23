import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  SafeMovementNotConfirmedError,
  SafeMovementTypeNotCancellableError,
} from "@/core/errors/domain-error";
import type { SafeMovementRepository } from "../domain/safe-movement.repository";
import type {
  SafeMovement,
  SafeMovementType,
} from "../domain/safe-movement.entity";
import type { CancelConfirmedSafeMovementInput } from "./dtos/cancel-confirmed-safe-movement.dto";

interface Deps {
  safeMovementRepository: SafeMovementRepository;
}

/**
 * Tipos elegíveis: só os que não têm efeito colateral em outra entidade
 * além do saldo do Cofre (`getBalance()` já soma só por
 * `status: "CONFIRMED"`, então cancelar aqui já reflete lá). `SANGRIA`
 * também afeta o Dinheiro Esperado do dia de caixa vinculado — coberto
 * porque `sumByCashRegisterDayAndType` passou a exigir
 * `status: "CONFIRMED"` explicitamente nos dois call sites que a usam
 * (`compute-live-cash-register-day.ts`, `close-cash-register.use-case.ts`).
 *
 * `FUNDING` fica de fora de propósito: alimenta
 * `CashRegisterDay.openingBalance`, um campo gravado no momento da
 * abertura — cancelar o `FUNDING` depois não corrige esse valor já
 * gravado, deixaria os dois lados inconsistentes. `CASH_REGISTER_HANDOFF`
 * e `ACCOUNTS_PAYABLE_PAYMENT` também ficam de fora: têm campos/status
 * próprios em outras entidades (`CashRegisterDay`, `AccountsPayable`)
 * que este cancelamento não atualizaria.
 */
const CANCELLABLE_TYPES: readonly SafeMovementType[] = [
  "SANGRIA",
  "MANUAL_ADJUSTMENT",
];

/**
 * Estorna uma movimentação do Cofre já CONFIRMADA — incidente que
 * motivou isto: sangria lançada com valor digitado errado (R$
 * 1.100.000 em vez de R$ 1.100), sem nenhuma forma de correção
 * existente até então. Diferente de `cancelSafeMovementUseCase` (que
 * rejeita uma conferência ainda `PENDING`, cujo valor nunca chegou a
 * contar no saldo): aqui a movimentação já afetava o saldo do Cofre —
 * cancelar de fato reverte esse efeito, não é só "descartar algo que
 * não tinha acontecido ainda".
 */
export async function cancelConfirmedSafeMovementUseCase(
  safeMovementId: string,
  input: CancelConfirmedSafeMovementInput,
  cancelledByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<SafeMovement> {
  const movement = await deps.safeMovementRepository.findById(safeMovementId);
  if (!movement || movement.organizationId !== organizationId) {
    throw new NotFoundError("Movimentação do Cofre", safeMovementId);
  }

  if (movement.status !== "CONFIRMED") {
    throw new SafeMovementNotConfirmedError(safeMovementId);
  }

  if (!CANCELLABLE_TYPES.includes(movement.type)) {
    throw new SafeMovementTypeNotCancellableError(
      safeMovementId,
      movement.type,
    );
  }

  const cancelled = await deps.safeMovementRepository.cancel(
    safeMovementId,
    cancelledByUserId,
    input.reason,
  );

  await prisma.auditLog.create({
    data: {
      userId: cancelledByUserId,
      entity: "SafeMovement",
      entityId: cancelled.id,
      action: "SAFE_MOVEMENT_CANCELLED",
      reason: input.reason,
      before: { amount: movement.amount.toFixed(2), status: movement.status },
      after: { amount: cancelled.amount.toFixed(2), status: cancelled.status },
    },
  });

  logger.warn("Movimentação confirmada do Cofre cancelada", {
    organizationId,
    safeMovementId: cancelled.id,
    type: cancelled.type,
    amount: cancelled.amount.toFixed(2),
    reason: input.reason,
  });

  return cancelled;
}
