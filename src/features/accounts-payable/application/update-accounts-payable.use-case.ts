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
 * Edição escopada: só fornecedor/categoria/vencimento/observação, só
 * enquanto a conta está PENDENTE (valor e status nunca mudam por aqui).
 * Quando a conta pertence a uma recorrência e `scope: "SERIES"` é
 * escolhido, propaga fornecedor/categoria/descrição pras próximas
 * ocorrências ainda PENDENTES (cada uma mantém seu próprio vencimento) —
 * ocorrências já pagas ou canceladas nunca são tocadas.
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
    dueDate: input.dueDate,
    paymentOrigin: input.paymentOrigin,
    barcode: input.barcode,
    pixKey: input.pixKey,
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
        dueDate: payable.dueDate,
        paymentOrigin: payable.paymentOrigin,
        barcode: payable.barcode,
        pixKey: payable.pixKey,
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

    for (const sibling of futurePending) {
      const siblingChanges = {
        supplierId: input.supplierId,
        categoryId: input.categoryId,
        description: input.description,
        // Vencimento é sempre o da própria ocorrência — nunca sobrescrito em lote.
        dueDate: sibling.dueDate,
        // Origem do pagamento é característica da série inteira, propaga
        // igual às demais — diferente de barcode/pixKey (documento próprio
        // de cada ocorrência, nunca sobrescrito em lote).
        paymentOrigin: input.paymentOrigin,
      };
      await deps.accountsPayableRepository.update(sibling.id, siblingChanges);
      await prisma.auditLog.create({
        data: {
          userId: updatedByUserId,
          entity: "AccountsPayable",
          entityId: sibling.id,
          action: "UPDATE",
          reason: "Alteração aplicada para recorrência.",
          after: siblingChanges,
        },
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
