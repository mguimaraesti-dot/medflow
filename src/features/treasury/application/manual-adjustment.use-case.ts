import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import { NotFoundError } from "@/core/errors/domain-error";
import type { SafeRepository } from "../domain/safe.repository";
import type { SafeMovementRepository } from "../domain/safe-movement.repository";
import type { SafeMovement } from "../domain/safe-movement.entity";
import type { ManualAdjustmentInput } from "./dtos/manual-adjustment.dto";

interface Deps {
  safeRepository: SafeRepository;
  safeMovementRepository: SafeMovementRepository;
}

/**
 * Ajuste manual do Cofre — só Admin (RBAC), sem pré-condição de caixa
 * aberto. `amount` pode ser negativo: único tipo de `SafeMovement` sem
 * direção implícita pelo `type` (decisão confirmada nesta sessão).
 */
export async function manualAdjustmentUseCase(
  input: ManualAdjustmentInput,
  performedByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<SafeMovement> {
  const safe = await deps.safeRepository.findByOrganization(organizationId);
  if (!safe) {
    throw new NotFoundError("Cofre", organizationId);
  }

  const movement = await deps.safeMovementRepository.create({
    organizationId,
    safeId: safe.id,
    type: "MANUAL_ADJUSTMENT",
    amount: input.amount.toFixed(2),
    performedByUserId,
    reason: input.reason,
  });

  await prisma.auditLog.create({
    data: {
      userId: performedByUserId,
      entity: "SafeMovement",
      entityId: movement.id,
      action: "SAFE_MANUAL_ADJUSTMENT",
      reason: input.reason,
      after: { amount: movement.amount.toFixed(2) },
    },
  });

  logger.warn("Ajuste manual do Cofre", {
    organizationId,
    safeMovementId: movement.id,
    amount: movement.amount.toFixed(2),
    reason: input.reason,
  });

  return movement;
}
