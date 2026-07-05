import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  PayableNotDeletedError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayable } from "../domain/accounts-payable.entity";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
}

/** Restaura uma conta excluída (soft delete) — só Administrador chega aqui. */
export async function restoreAccountsPayableUseCase(
  id: string,
  restoredByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<AccountsPayable> {
  const payable = await deps.accountsPayableRepository.findById(id);
  if (!payable || payable.organizationId !== organizationId) {
    throw new NotFoundError("Conta a pagar", id);
  }

  if (!payable.deletedAt) {
    throw new PayableNotDeletedError(id);
  }

  const restored = await deps.accountsPayableRepository.restore(id);

  await prisma.auditLog.create({
    data: {
      userId: restoredByUserId,
      entity: "AccountsPayable",
      entityId: id,
      action: "UPDATE",
      reason: "Conta restaurada.",
      before: { deletedAt: payable.deletedAt },
      after: { deletedAt: null },
    },
  });

  logger.info("Conta a pagar restaurada", {
    organizationId,
    accountsPayableId: id,
  });

  return restored;
}
