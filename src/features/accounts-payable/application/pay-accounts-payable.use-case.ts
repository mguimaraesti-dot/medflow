import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  InsufficientSafeBalanceError,
  NotFoundError,
  PayableAlreadyProcessedError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type {
  AccountsPayable,
  PaymentConfirmationSource,
} from "../domain/accounts-payable.entity";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  safeRepository: SafeRepository;
}

/**
 * Ciclo de vida da conta (Pendente -> Pago). `paidVia` é "SYSTEM" pra
 * confirmação manual no app (default, mantém o comportamento de
 * sempre); "WHATSAPP" é usado só pelo webhook da Z-API
 * (`handle-zapi-webhook.use-case.ts`), com `paidByUserId` sendo o
 * usuário de sistema (ver `whatsapp-system-user.ts`) — nunca a pessoa
 * real que clicou o botão, já que o webhook não tem sessão. Quando
 * `payable.paymentOrigin` (decidido no cadastro/edição) é "COFRE",
 * debita o saldo da Tesouraria e gera um `SafeMovement` vinculado — a
 * checagem de saldo "de verdade" acontece aqui, antes de chamar o
 * repositório, que reconfirma dentro da transação como rede de
 * segurança contra corrida (mesmo padrão de
 * `open-cash-register.use-case.ts`).
 */
export async function payAccountsPayableUseCase(
  accountsPayableId: string,
  paidByUserId: string,
  organizationId: string,
  deps: Deps,
  paidVia: PaymentConfirmationSource = "SYSTEM",
): Promise<AccountsPayable> {
  const payable =
    await deps.accountsPayableRepository.findById(accountsPayableId);
  if (!payable || payable.organizationId !== organizationId) {
    throw new NotFoundError("Conta a pagar", accountsPayableId);
  }

  if (payable.status !== "PENDING") {
    throw new PayableAlreadyProcessedError(accountsPayableId);
  }

  let safeBalance;
  if (payable.paymentOrigin === "COFRE") {
    safeBalance = await deps.safeRepository.getBalance(organizationId);
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
      paidVia,
      paymentOrigin: payable.paymentOrigin,
      amount: payable.amount.toFixed(2),
      organizationId,
      // Reaproveitado dentro da transação em vez de recalculado do zero —
      // a proteção contra corrida vira um lock de linha (ver repositório).
      safeBalance: safeBalance?.toFixed(2),
    },
  );

  await prisma.auditLog.create({
    data: {
      userId: paidByUserId,
      entity: "AccountsPayable",
      entityId: payable.id,
      action: "PAYMENT_CONFIRMED",
      after: {
        paidVia,
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
