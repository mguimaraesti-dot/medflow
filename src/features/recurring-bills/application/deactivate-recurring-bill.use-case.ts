import { prisma } from "@/core/database/prisma.client";
import {
  NotFoundError,
  RecurringBillAlreadyEndedError,
} from "@/core/errors/domain-error";
import type { RecurringBillRepository } from "../domain/recurring-bill.repository";
import type { RecurringBill } from "../domain/recurring-bill.entity";

interface Deps {
  recurringBillRepository: RecurringBillRepository;
}

/**
 * Encerramento direto (botão "Encerrar Recorrência" no Card da conta) — só
 * desativa a recorrência, nunca cancela as ocorrências já geradas ("as
 * contas já existentes permanecerão disponíveis"). Diferente do encerramento
 * via `cancelAccountsPayableUseCase` (scope SERIES), que além de desativar
 * também cancela as ocorrências PENDENTES restantes — esse outro fluxo grava
 * sua própria auditoria e não passa por aqui.
 */
export async function deactivateRecurringBillUseCase(
  recurringBillId: string,
  organizationId: string,
  deactivatedByUserId: string,
  deps: Deps,
): Promise<RecurringBill> {
  const bill = await deps.recurringBillRepository.findById(recurringBillId);
  if (!bill || bill.organizationId !== organizationId) {
    throw new NotFoundError("Recorrência", recurringBillId);
  }
  if (!bill.active) {
    throw new RecurringBillAlreadyEndedError(recurringBillId);
  }

  const deactivated =
    await deps.recurringBillRepository.deactivate(recurringBillId);

  await prisma.auditLog.create({
    data: {
      userId: deactivatedByUserId,
      entity: "RecurringBill",
      entityId: recurringBillId,
      action: "UPDATE",
      reason: "Recorrência encerrada.",
      before: { active: true },
      after: { active: false },
    },
  });

  return deactivated;
}
