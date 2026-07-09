import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  SafeMovementNotPendingError,
} from "@/core/errors/domain-error";
import type { SafeMovementRepository } from "../domain/safe-movement.repository";
import type { SafeMovement } from "../domain/safe-movement.entity";

interface Deps {
  safeMovementRepository: SafeMovementRepository;
}

/**
 * Confirma a conferência gerencial do fechamento de caixa — só depois
 * disso o `CASH_REGISTER_HANDOFF` conta no saldo do Cofre (RBAC:
 * `treasury:confirm-movement`, exclusivo de Admin/Owner/Finance).
 */
export async function confirmSafeMovementUseCase(
  safeMovementId: string,
  confirmedByUserId: string,
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

  const confirmed = await deps.safeMovementRepository.confirm(
    safeMovementId,
    confirmedByUserId,
  );

  await prisma.auditLog.create({
    data: {
      userId: confirmedByUserId,
      entity: "SafeMovement",
      entityId: confirmed.id,
      action: "CASH_REGISTER_HANDOFF_CONFIRMED",
      after: { amount: confirmed.amount.toFixed(2) },
    },
  });

  logger.info("Conferência do Cofre confirmada", {
    organizationId,
    safeMovementId: confirmed.id,
    amount: confirmed.amount.toFixed(2),
  });

  return confirmed;
}
