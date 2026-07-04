import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  CashRegisterAlreadyOpenError,
  ConflictError,
  NotFoundError,
} from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "../domain/cash-register-day.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";
import type { ReopenCashRegisterInput } from "./dtos/reopen-cash-register.dto";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
}

/**
 * US08 — Reabertura de caixa. Autorização (só Admin) é responsabilidade
 * do RBAC na rota (`requirePermission(PERMISSIONS.CASH_REGISTER_REOPEN)`),
 * não deste use case — aqui a regra é só sobre o estado do próprio
 * registro (existe? já está aberto?) e a auditoria com o motivo.
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

  // Motor de Tesouraria: PENDING_CONFERENCE só volta para OPEN via
  // rejeição da conferência (gerência) — a Reabertura é uma transição
  // distinta, só a partir de CLOSED (ADR 2.1/Seção 5, Q2).
  if (cashRegisterDay.status === "PENDING_CONFERENCE") {
    throw new ConflictError(
      "Caixa aguardando conferência não pode ser reaberto — rejeite a conferência para voltar ao status aberto.",
      { cashRegisterDayId: cashRegisterDay.id },
    );
  }

  const reopened = await deps.cashRegisterDayRepository.reopen(
    cashRegisterDayId,
    {
      reopenedByUserId,
      reason: input.reason,
    },
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
  });

  return reopened;
}
