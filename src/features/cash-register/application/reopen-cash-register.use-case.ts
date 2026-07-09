import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  CashRegisterAlreadyOpenError,
  NotFoundError,
} from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "../domain/cash-register-day.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";
import type { ReopenCashRegisterInput } from "./dtos/reopen-cash-register.dto";

const REOPEN_CANCEL_REASON = "Caixa reaberto antes da confirmação do Gerente";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
  safeMovementRepository: SafeMovementRepository;
}

/**
 * US08 — Reabertura de caixa (secretária ou Admin, sempre com
 * justificativa). Autorização é responsabilidade do RBAC na rota
 * (`requirePermission(PERMISSIONS.CASH_REGISTER_REOPEN)`), não deste
 * use case — aqui a regra é só sobre o estado do próprio registro
 * (existe? já está aberto?) e a auditoria com o motivo.
 *
 * Se o fechamento que está sendo desfeito já tinha gerado um
 * `SafeMovement` `CASH_REGISTER_HANDOFF`/`PENDING` (aguardando
 * conferência do Gerente), esse pendente é cancelado automaticamente —
 * o `countedAmount` que ele carrega deixa de fazer sentido assim que o
 * caixa reabre; o próximo fechamento cria um novo pendente com o valor
 * correto.
 */
export async function reopenCashRegisterUseCase(
  cashRegisterDayId: string,
  input: ReopenCashRegisterInput,
  reopenedByUserId: string,
  deps: Deps,
): Promise<CashRegisterDay> {
  const cashRegisterDay =
    await deps.cashRegisterDayRepository.findById(cashRegisterDayId);
  if (!cashRegisterDay) {
    throw new NotFoundError("Caixa", cashRegisterDayId);
  }

  if (cashRegisterDay.status === "OPEN") {
    throw new CashRegisterAlreadyOpenError(
      cashRegisterDay.organizationId,
      cashRegisterDay.date.toISOString(),
    );
  }

  const reopened = await deps.cashRegisterDayRepository.reopen(
    cashRegisterDayId,
    {
      reopenedByUserId,
      reason: input.reason,
    },
  );

  const pendingHandoffs =
    await deps.safeMovementRepository.findPendingByCashRegisterDay(
      cashRegisterDayId,
    );
  await Promise.all(
    pendingHandoffs.map((movement) =>
      deps.safeMovementRepository.cancel(
        movement.id,
        reopenedByUserId,
        REOPEN_CANCEL_REASON,
      ),
    ),
  );

  await prisma.auditLog.create({
    data: {
      userId: reopenedByUserId,
      entity: "CashRegisterDay",
      entityId: reopened.id,
      action: "CASH_REGISTER_REOPENED",
      reason: input.reason,
    },
  });

  logger.warn("Caixa reaberto", {
    cashRegisterDayId: reopened.id,
    reopenedByUserId,
    reason: input.reason,
    cancelledPendingHandoffs: pendingHandoffs.length,
  });

  return reopened;
}
