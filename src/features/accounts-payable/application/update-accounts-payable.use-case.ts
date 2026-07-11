import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  PayableAlreadyProcessedError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayable } from "../domain/accounts-payable.entity";
import type { UpdateAccountsPayableInput } from "./dtos/update-accounts-payable.dto";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
}

/**
 * Edição escopada: fornecedor/categoria/vencimento/valor/observação, só
 * enquanto a conta está PENDENTE (status nunca muda por aqui). Quando a
 * conta pertence a uma recorrência e `scope: "SERIES"` é escolhido, propaga
 * fornecedor/categoria/descrição pras próximas ocorrências ainda PENDENTES
 * (cada uma mantém seu próprio vencimento e valor) — ocorrências já pagas
 * ou canceladas nunca são tocadas.
 */
export async function updateAccountsPayableUseCase(
  id: string,
  input: UpdateAccountsPayableInput,
  updatedByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<AccountsPayable> {
  const payable = await deps.accountsPayableRepository.findById(id);
  if (!payable || payable.organizationId !== organizationId) {
    throw new NotFoundError("Conta a pagar", id);
  }

  if (payable.status !== "PENDING") {
    throw new PayableAlreadyProcessedError(id);
  }

  const changes = {
    supplierId: input.supplierId,
    categoryId: input.categoryId,
    description: input.description,
    amount: input.amount.toFixed(2),
    dueDate: input.dueDate,
    paymentOrigin: input.paymentOrigin,
    barcode: input.barcode,
    pixKey: input.pixKey,
    reminderDaysBefore: input.reminderDaysBefore,
  };

  const applyToSeries = input.scope === "SERIES" && payable.recurringBillId;
  const reason = applyToSeries
    ? "Alteração aplicada para recorrência."
    : "Alteração aplicada apenas nesta ocorrência.";

  const updated = await deps.accountsPayableRepository.update(id, changes);

  await prisma.auditLog.create({
    data: {
      userId: updatedByUserId,
      entity: "AccountsPayable",
      entityId: id,
      action: "UPDATE",
      reason,
      before: {
        supplierId: payable.supplierId,
        categoryId: payable.categoryId,
        description: payable.description,
        amount: payable.amount.toFixed(2),
        dueDate: payable.dueDate,
        paymentOrigin: payable.paymentOrigin,
        barcode: payable.barcode,
        pixKey: payable.pixKey,
        reminderDaysBefore: payable.reminderDaysBefore,
      },
      after: changes,
    },
  });

  if (applyToSeries) {
    const siblings = await deps.accountsPayableRepository.listByRecurringBill(
      payable.recurringBillId as string,
    );
    const futurePending = siblings.filter(
      (sibling) =>
        sibling.id !== id &&
        sibling.status === "PENDING" &&
        (sibling.occurrenceNumber ?? 0) > (payable.occurrenceNumber ?? 0),
    );

    if (futurePending.length > 0) {
      const siblingIds = futurePending.map((sibling) => sibling.id);
      // Vencimento é sempre o da própria ocorrência — nunca sobrescrito em
      // lote, por isso não entra em `UpdateManyForSeriesInput`.
      const siblingChanges = {
        supplierId: input.supplierId,
        categoryId: input.categoryId,
        description: input.description,
        // Origem do pagamento é característica da série inteira, propaga
        // igual às demais — diferente de barcode/pixKey (documento próprio
        // de cada ocorrência, nunca sobrescrito em lote).
        paymentOrigin: input.paymentOrigin,
      };

      // Um único UPDATE em lote (updateMany) + um único INSERT em lote pro
      // histórico, em vez de update()+auditLog.create() sequenciais por
      // ocorrência — evita N idas ao banco pra propagar a mesma edição.
      await deps.accountsPayableRepository.updateManyForSeries(
        siblingIds,
        siblingChanges,
      );
      await prisma.auditLog.createMany({
        data: siblingIds.map((siblingId) => ({
          userId: updatedByUserId,
          entity: "AccountsPayable",
          entityId: siblingId,
          action: "UPDATE" as const,
          reason: "Alteração aplicada para recorrência.",
          after: siblingChanges,
        })),
      });
    }
  }

  logger.info("Conta a pagar atualizada", {
    organizationId,
    accountsPayableId: id,
    scope: input.scope,
  });

  return updated;
}
