import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  CashRegisterNotOpenError,
  NotFoundError,
} from "@/core/errors/domain-error";
import type { SafeRepository } from "../domain/safe.repository";
import type { SafeMovementRepository } from "../domain/safe-movement.repository";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { SafeMovement } from "../domain/safe-movement.entity";
import type { RequestSangriaInput } from "./dtos/request-sangria.dto";

interface Deps {
  safeRepository: SafeRepository;
  safeMovementRepository: SafeMovementRepository;
  cashRegisterDayRepository: CashRegisterDayRepository;
}

/**
 * Sangria — remove dinheiro físico do caixa aberto e o registra no
 * Cofre. Exige caixa `OPEN` (ADR 2.8): a sangria referencia o caixa do
 * dia via `relatedCashRegisterDayId`, usado depois no fechamento para
 * descontar do Dinheiro Esperado.
 */
export async function requestSangriaUseCase(
  input: RequestSangriaInput,
  requestedByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<SafeMovement> {
  const openRegister =
    await deps.cashRegisterDayRepository.findOpenByOrganization(organizationId);
  if (!openRegister) {
    throw new CashRegisterNotOpenError(organizationId);
  }

  const safe = await deps.safeRepository.findByOrganization(organizationId);
  if (!safe) {
    throw new NotFoundError("Cofre", organizationId);
  }

  const movement = await deps.safeMovementRepository.create({
    organizationId,
    safeId: safe.id,
    type: "SANGRIA",
    amount: input.amount.toFixed(2),
    relatedCashRegisterDayId: openRegister.id,
    performedByUserId: requestedByUserId,
    reason: input.reason,
  });

  await prisma.auditLog.create({
    data: {
      userId: requestedByUserId,
      entity: "SafeMovement",
      entityId: movement.id,
      action: "SAFE_SANGRIA",
      after: {
        amount: movement.amount.toFixed(2),
        relatedCashRegisterDayId: openRegister.id,
      },
    },
  });

  logger.info("Sangria registrada", {
    organizationId,
    safeMovementId: movement.id,
    cashRegisterDayId: openRegister.id,
    amount: movement.amount.toFixed(2),
  });

  return movement;
}
