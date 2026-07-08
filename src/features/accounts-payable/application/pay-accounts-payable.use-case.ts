import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  InsufficientSafeBalanceError,
  NotFoundError,
  PayableAlreadyProcessedError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayable } from "../domain/accounts-payable.entity";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  safeRepository: SafeRepository;
}

/**
 * Ciclo de vida da conta (Pendente -> Pago). `paidVia` é sempre "SYSTEM"
 * hoje — WhatsApp ainda não está integrado, só preparado via
 * `publicToken`. Quando `payable.paymentOrigin` (decidido no
 * cadastro/edição) é "COFRE", debita o saldo da Tesouraria e gera um
 * `SafeMovement` vinculado — a checagem de saldo "de verdade" acontece
 * aqui, antes de chamar o repositório, que reconfirma dentro da
 * transação como rede de segurança contra corrida (mesmo padrão de
 * `open-cash-register.use-case.ts`).
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

  if (payable.paymentOrigin === "COFRE") {
    const safeBalance = await deps.safeRepository.getBalance(organizationId);
    if (safeBalance.lessThan(payable.amount)) {
      throw new InsufficientSafeBalanceError(
        organizationId,
        payable.amount.toFixed(2),
        safeBalance.toFixed(2),
      );
    }
  }

  const result = await deps.accountsPayableRepository.markAsPaid(
    accountsPayableId,
    {
      paidByUserId,
      paidVia: "SYSTEM",
      paymentOrigin: payable.paymentOrigin,
      amount: payable.amount.toFixed(2),
      organizationId,
    },
  );

  await prisma.auditLog.create({
    data: {
      userId: paidByUserId,
      entity: "AccountsPayable",
      entityId: payable.id,
      action: "PAYMENT_CONFIRMED",
      after: {
        paidVia: "SYSTEM",
        paymentOrigin: payable.paymentOrigin,
        amount: payable.amount.toFixed(2),
        ...(result.paidSafeMovementId && {
          safeMovementId: result.paidSafeMovementId,
        }),
      },
    },
  });

  logger.info("Conta a pagar paga", {
    organizationId,
    accountsPayableId: payable.id,
    paymentOrigin: payable.paymentOrigin,
  });

  return result;
}
