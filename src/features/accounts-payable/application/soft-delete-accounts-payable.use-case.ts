import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  PayableAlreadyDeletedError,
  PayableCannotBeDeletedError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayable } from "../domain/accounts-payable.entity";
import type { DeleteAccountsPayableInput } from "./dtos/delete-accounts-payable.dto";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
}

/**
 * Exclusão lógica (soft delete) — nunca remove a linha do banco. Só
 * Administrador chega aqui (checado na rota via requirePermission).
 * Só é permitida enquanto a conta está PENDENTE: contas pagas ou
 * canceladas preservam a integridade do histórico e nunca são excluíveis.
 */
export async function softDeleteAccountsPayableUseCase(
  id: string,
  input: DeleteAccountsPayableInput,
  deletedByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<AccountsPayable> {
  const payable = await deps.accountsPayableRepository.findById(id);
  if (!payable || payable.organizationId !== organizationId) {
    throw new NotFoundError("Conta a pagar", id);
  }

  if (payable.deletedAt) {
    throw new PayableAlreadyDeletedError(id);
  }

  if (payable.status !== "PENDING") {
    throw new PayableCannotBeDeletedError(
      id,
      payable.status as "PAID" | "CANCELLED",
    );
  }

  const deleted = await deps.accountsPayableRepository.softDelete(id, {
    deletedByUserId,
    deletionReason: input.reason,
  });

  await prisma.auditLog.create({
    data: {
      userId: deletedByUserId,
      entity: "AccountsPayable",
      entityId: id,
      action: "DELETE",
      reason: input.reason,
      before: { deletedAt: null },
      after: { deletedAt: deleted.deletedAt },
    },
  });

  logger.info("Conta a pagar excluída (soft delete)", {
    organizationId,
    accountsPayableId: id,
  });

  return deleted;
}
