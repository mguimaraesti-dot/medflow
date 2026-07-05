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

/**
 * MVP atual não faz controle financeiro nesta tela — só o ciclo de vida
 * da conta (Pendente -> Pago). Sem caixa, sem forma de pagamento, sem
 * lançamento de Fluxo de Caixa vinculado (decisão de escopo do
 * refinamento UX — controle financeiro completo fica pra uma versão
 * futura). `paidVia` é sempre "SYSTEM" hoje — WhatsApp ainda não está
 * integrado, só preparado via `publicToken`.
 */
export async function payAccountsPayableUseCase(
  accountsPayableId: string,
  paidByUserId: string,
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

  const result = await deps.accountsPayableRepository.markAsPaid(
    accountsPayableId,
    { paidByUserId, paidVia: "SYSTEM" },
  );

  await prisma.auditLog.create({
    data: {
      userId: paidByUserId,
      entity: "AccountsPayable",
      entityId: payable.id,
      action: "PAYMENT_CONFIRMED",
      after: { paidVia: "SYSTEM" },
    },
  });

  logger.info("Conta a pagar paga", {
    organizationId,
    accountsPayableId: payable.id,
  });

  return result;
}
