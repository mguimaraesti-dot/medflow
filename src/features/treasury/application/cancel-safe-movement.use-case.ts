import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  SafeMovementNotPendingError,
} from "@/core/errors/domain-error";
import type { SafeMovementRepository } from "../domain/safe-movement.repository";
import type { SafeMovement } from "../domain/safe-movement.entity";
import type { CancelSafeMovementInput } from "./dtos/cancel-safe-movement.dto";

interface Deps {
  safeMovementRepository: SafeMovementRepository;
}

/**
 * Rejeita a conferência gerencial do fechamento de caixa — o dinheiro
 * contado nunca chega a entrar no saldo do Cofre (RBAC:
 * `treasury:confirm-movement`, exclusivo de Admin/Owner/Finance).
 */
export async function cancelSafeMovementUseCase(
  safeMovementId: string,
  input: CancelSafeMovementInput,
  cancelledByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<SafeMovement> {
  const movement = await deps.safeMovementRepository.findById(safeMovementId);
  if (!movement || movement.organizationId !== organizationId) {
    throw new NotFoundError("Movimentação do Cofre", safeMovementId);
  }

  if (movement.status !== "PENDING") {
    throw new SafeMovementNotPendingError(safeMovementId);
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
      action: "CASH_REGISTER_CONFERENCE_REJECTED",
      reason: input.reason,
      after: { amount: cancelled.amount.toFixed(2) },
    },
  });

  logger.warn("Conferência do Cofre rejeitada", {
    organizationId,
    safeMovementId: cancelled.id,
    amount: cancelled.amount.toFixed(2),
    reason: input.reason,
  });

  return cancelled;
}
