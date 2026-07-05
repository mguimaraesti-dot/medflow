import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  PayableAlreadyProcessedError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayable } from "../domain/accounts-payable.entity";
import type { RecurringBillRepository } from "@/features/recurring-bills/domain/recurring-bill.repository";
import type { CancelAccountsPayableInput } from "./dtos/cancel-accounts-payable.dto";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  /** Só é usado quando `scope: "SERIES"` numa conta recorrente. */
  recurringBillRepository?: RecurringBillRepository;
}

/**
 * "SINGLE" cancela só esta ocorrência (comportamento de sempre, inalterado
 * pra contas avulsas). "SERIES" também encerra a recorrência (desativa o
 * RecurringBill) e cancela as demais ocorrências ainda PENDENTES da série —
 * nunca exclui nada, nunca toca ocorrências já pagas ou já canceladas.
 */
export async function cancelAccountsPayableUseCase(
  accountsPayableId: string,
  cancelledByUserId: string,
  organizationId: string,
  deps: Deps,
  input: CancelAccountsPayableInput = { scope: "SINGLE" },
): Promise<AccountsPayable> {
  const payable =
    await deps.accountsPayableRepository.findById(accountsPayableId);
  if (!payable || payable.organizationId !== organizationId) {
    throw new NotFoundError("Conta a pagar", accountsPayableId);
  }

  if (payable.status !== "PENDING") {
    throw new PayableAlreadyProcessedError(accountsPayableId);
  }

  const endingSeries = input.scope === "SERIES" && payable.recurringBillId;

  const cancelled =
    await deps.accountsPayableRepository.cancel(accountsPayableId);

  await prisma.auditLog.create({
    data: {
      userId: cancelledByUserId,
      entity: "AccountsPayable",
      entityId: payable.id,
      action: "UPDATE",
      before: { status: payable.status },
      after: { status: "CANCELLED" },
      reason: endingSeries ? "Cancelado ao encerrar a recorrência." : undefined,
    },
  });

  if (endingSeries && deps.recurringBillRepository) {
    const recurringBillId = payable.recurringBillId as string;

    await deps.recurringBillRepository.deactivate(recurringBillId);
    await prisma.auditLog.create({
      data: {
        userId: cancelledByUserId,
        entity: "RecurringBill",
        entityId: recurringBillId,
        action: "UPDATE",
        reason: "Recorrência encerrada.",
        after: { active: false },
      },
    });

    const siblings =
      await deps.accountsPayableRepository.listByRecurringBill(recurringBillId);
    const otherPending = siblings.filter(
      (sibling) =>
        sibling.id !== accountsPayableId && sibling.status === "PENDING",
    );

    for (const sibling of otherPending) {
      await deps.accountsPayableRepository.cancel(sibling.id);
      await prisma.auditLog.create({
        data: {
          userId: cancelledByUserId,
          entity: "AccountsPayable",
          entityId: sibling.id,
          action: "UPDATE",
          reason: "Cancelado ao encerrar a recorrência.",
          before: { status: "PENDING" },
          after: { status: "CANCELLED" },
        },
      });
    }
  }

  logger.info("Conta a pagar cancelada", {
    organizationId,
    accountsPayableId: payable.id,
    scope: input.scope,
  });

  return cancelled;
}
