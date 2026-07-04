import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  PayableAlreadyProcessedError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayable } from "../domain/accounts-payable.entity";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
}

export async function cancelAccountsPayableUseCase(
  accountsPayableId: string,
  cancelledByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<AccountsPayable> {
  const payable =
    await deps.accountsPayableRepository.findById(accountsPayableId);
  if (!payable || payable.organizationId !== organizationId) {
    throw new NotFoundError("Conta a pagar", accountsPayableId);
  }

  if (payable.status !== "PENDING") {
    throw new PayableAlreadyProcessedError(accountsPayableId);
  }

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
    },
  });

  logger.info("Conta a pagar cancelada", {
    organizationId,
    accountsPayableId: payable.id,
  });

  return cancelled;
}
