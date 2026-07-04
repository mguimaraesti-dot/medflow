import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import { CashRegisterNotPendingConferenceError } from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "../domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";
import type { ConfirmHandoffInput } from "./dtos/confirm-handoff.dto";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
  cashFlowEntryRepository: CashFlowEntryRepository;
}

/**
 * Confirmação do handoff (gerência) — segunda metade da dupla
 * conferência (ADR 2.1/2.8). Muda o status para `CLOSED` e credita o
 * Cofre com `receivedAmount` (não `countedAmount` — os dois podem
 * divergir, é exatamente o ponto da dupla conferência), atomicamente
 * dentro de `cashRegisterDayRepository.confirmHandoff`.
 *
 * `totalIn`/`totalOut`/`closingBalance` (saldo contábil — todas as
 * formas de pagamento) são calculados aqui, não em `close()`, porque só
 * agora o registro realmente vira `CLOSED` (usado hoje só pelo fallback
 * de saldo do Dashboard).
 */
export async function confirmCashRegisterHandoffUseCase(
  input: ConfirmHandoffInput,
  handoffConfirmedByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<CashRegisterDay> {
  const pendingRegister =
    await deps.cashRegisterDayRepository.findPendingConferenceByOrganization(
      organizationId,
    );
  if (!pendingRegister) {
    throw new CashRegisterNotPendingConferenceError(organizationId);
  }

  const receivedAmount = new Prisma.Decimal(input.receivedAmount.toFixed(2));
  const countedAmount = new Prisma.Decimal(pendingRegister.countedAmount ?? 0);
  const confirmedDifference = receivedAmount.minus(countedAmount);

  const sums = await deps.cashFlowEntryRepository.sumByCashRegisterDay(
    pendingRegister.id,
  );
  const openingBalance = new Prisma.Decimal(pendingRegister.openingBalance);
  const totalIn = new Prisma.Decimal(sums.totalIn);
  const totalOut = new Prisma.Decimal(sums.totalOut);
  const closingBalance = openingBalance.plus(totalIn).minus(totalOut);

  const closed = await deps.cashRegisterDayRepository.confirmHandoff(
    pendingRegister.id,
    {
      receivedAmount: receivedAmount.toFixed(2),
      confirmedDifference: confirmedDifference.toFixed(2),
      handoffConfirmedByUserId,
      totalIn: totalIn.toFixed(2),
      totalOut: totalOut.toFixed(2),
      closingBalance: closingBalance.toFixed(2),
    },
  );

  await prisma.auditLog.create({
    data: {
      userId: handoffConfirmedByUserId,
      entity: "CashRegisterDay",
      entityId: closed.id,
      action: "CASH_REGISTER_HANDOFF_CONFIRMED",
      after: {
        receivedAmount: receivedAmount.toFixed(2),
        confirmedDifference: confirmedDifference.toFixed(2),
      },
    },
  });

  logger.info("Handoff de caixa confirmado", {
    organizationId,
    cashRegisterDayId: closed.id,
    receivedAmount: receivedAmount.toFixed(2),
    confirmedDifference: confirmedDifference.toFixed(2),
  });

  return closed;
}
