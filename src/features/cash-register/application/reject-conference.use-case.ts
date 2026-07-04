import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import { CashRegisterNotPendingConferenceError } from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "../domain/cash-register-day.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";
import type { RejectConferenceInput } from "./dtos/reject-conference.dto";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
}

/**
 * Rejeição da conferência (gerência) — devolve o caixa para `OPEN` sem
 * mexer no Cofre, distinta da Reabertura (Admin, só a partir de
 * `CLOSED` — ADR 2.1/Seção 5, Q2).
 */
export async function rejectConferenceUseCase(
  input: RejectConferenceInput,
  rejectedByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<CashRegisterDay> {
  const pendingRegister =
    await deps.cashRegisterDayRepository.findPendingConferenceByOrganization(
      organizationId,
    );
  if (!pendingRegister) {
    throw new CashRegisterNotPendingConferenceError(organizationId);
  }

  const reopened = await deps.cashRegisterDayRepository.rejectConference(
    pendingRegister.id,
    { reason: input.reason },
  );

  await prisma.auditLog.create({
    data: {
      userId: rejectedByUserId,
      entity: "CashRegisterDay",
      entityId: reopened.id,
      action: "CASH_REGISTER_CONFERENCE_REJECTED",
      reason: input.reason,
    },
  });

  logger.warn("Conferência de caixa rejeitada", {
    organizationId,
    cashRegisterDayId: reopened.id,
    reason: input.reason,
  });

  return reopened;
}
