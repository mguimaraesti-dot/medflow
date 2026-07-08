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
 * "SINGLE" cancela só esta ocorrência — vale tanto pra uma conta PENDENTE
 * avulsa quanto pra uma correção pontual de conta já PAGA (ex: pagamento
 * duplicado). "SERIES" também encerra a recorrência (desativa o
 * RecurringBill) e cancela as demais ocorrências ainda PENDENTES da série —
 * só faz sentido a partir de uma ocorrência ainda PENDENTE (encerrar uma
 * série é uma decisão sobre o futuro, não uma correção de pagamento já
 * feito); nunca exclui nada, nunca toca ocorrências já pagas ou canceladas.
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

  if (payable.status !== "PENDING" && payable.status !== "PAID") {
    throw new PayableAlreadyProcessedError(accountsPayableId);
  }

  const endingSeries =
    input.scope === "SERIES" &&
    payable.recurringBillId &&
    payable.status === "PENDING";

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

    if (otherPending.length > 0) {
      const siblingIds = otherPending.map((sibling) => sibling.id);

      // Um único UPDATE em lote (updateMany) + um único INSERT em lote pro
      // histórico, em vez de cancel()+auditLog.create() sequenciais por
      // ocorrência — evita N idas ao banco ao encerrar uma série longa.
      await deps.accountsPayableRepository.cancelMany(siblingIds);
      await prisma.auditLog.createMany({
        data: siblingIds.map((siblingId) => ({
          userId: cancelledByUserId,
          entity: "AccountsPayable",
          entityId: siblingId,
          action: "UPDATE" as const,
          reason: "Cancelado ao encerrar a recorrência.",
          before: { status: "PENDING" },
          after: { status: "CANCELLED" },
        })),
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
