import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  PayableAlreadyProcessedError,
  CashRegisterNotOpenError,
} from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayable } from "../domain/accounts-payable.entity";
import type { PayAccountsPayableInput } from "./dtos/pay-accounts-payable.dto";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  cashRegisterDayRepository: CashRegisterDayRepository;
}

/**
 * Pagar uma conta grava o pagamento e o lançamento de caixa (`OUT`)
 * correspondente numa única transação (ver `markAsPaid` no
 * repositório) — precisa de caixa aberto hoje, mesma regra já usada
 * pra qualquer lançamento de saída.
 */
export async function payAccountsPayableUseCase(
  accountsPayableId: string,
  input: PayAccountsPayableInput,
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

  const openRegister =
    await deps.cashRegisterDayRepository.findOpenByOrganization(organizationId);
  if (!openRegister) {
    throw new CashRegisterNotOpenError(organizationId);
  }

  const result = await deps.accountsPayableRepository.markAsPaid(
    accountsPayableId,
    {
      paidByUserId,
      cashFlowEntry: {
        organizationId,
        cashRegisterDayId: openRegister.id,
        type: "OUT",
        amount: payable.amount.toFixed(2),
        description: payable.description,
        categoryId: payable.categoryId,
        paymentMethodId: input.paymentMethodId,
        accountsPayableId: payable.id,
        createdByUserId: paidByUserId,
      },
    },
  );

  await prisma.auditLog.create({
    data: {
      userId: paidByUserId,
      entity: "AccountsPayable",
      entityId: payable.id,
      action: "PAYMENT_CONFIRMED",
      after: {
        amount: payable.amount.toFixed(2),
        paymentMethodId: input.paymentMethodId,
      },
    },
  });

  logger.info("Conta a pagar paga", {
    organizationId,
    accountsPayableId: payable.id,
    cashFlowEntryId: result.cashFlowEntry.id,
  });

  return result.payable;
}
