import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import { CashRegisterNotOpenError } from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "../domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";
import type { CloseCashRegisterInput } from "./dtos/close-cash-register.dto";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
  cashFlowEntryRepository: CashFlowEntryRepository;
  safeMovementRepository: SafeMovementRepository;
}

/**
 * US07 — Fechamento de caixa (secretária presta contas).
 *
 * Motor de Tesouraria (ADR 2.7/2.8): não fecha mais direto — vai para
 * `PENDING_CONFERENCE` até a gerência confirmar o handoff (ou rejeitar).
 * `expectedCashAmount`/`difference` são SEMPRE calculados aqui a partir
 * dos lançamentos reais — nunca aceitos do cliente. `countedAmount` é a
 * única entrada do usuário.
 *
 * Dinheiro Esperado = Saldo Inicial + Entradas em dinheiro
 *                      − Saídas em dinheiro − Sangrias do dia.
 */
export async function closeCashRegisterUseCase(
  input: CloseCashRegisterInput,
  closedByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<CashRegisterDay> {
  const openRegister =
    await deps.cashRegisterDayRepository.findOpenByOrganization(organizationId);
  if (!openRegister) {
    throw new CashRegisterNotOpenError(organizationId);
  }

  const [cashSums, sangriaTotal] = await Promise.all([
    deps.cashFlowEntryRepository.sumCashOnlyByCashRegisterDay(openRegister.id),
    deps.safeMovementRepository.sumByCashRegisterDayAndType(
      openRegister.id,
      "SANGRIA",
    ),
  ]);

  const openingBalance = new Prisma.Decimal(openRegister.openingBalance);
  const cashIn = new Prisma.Decimal(cashSums.totalIn);
  const cashOut = new Prisma.Decimal(cashSums.totalOut);
  const sangrias = new Prisma.Decimal(sangriaTotal);

  const expectedCashAmount = openingBalance
    .plus(cashIn)
    .minus(cashOut)
    .minus(sangrias);
  const countedAmount = new Prisma.Decimal(input.countedAmount.toFixed(2));
  const difference = countedAmount.minus(expectedCashAmount);

  const closed = await deps.cashRegisterDayRepository.close(openRegister.id, {
    expectedCashAmount: expectedCashAmount.toFixed(2),
    countedAmount: countedAmount.toFixed(2),
    difference: difference.toFixed(2),
    closureNote: input.closureNote,
    closedByUserId,
  });

  await prisma.auditLog.create({
    data: {
      userId: closedByUserId,
      entity: "CashRegisterDay",
      entityId: closed.id,
      action: "CASH_REGISTER_CONFERENCE_REQUESTED",
      after: {
        expectedCashAmount: expectedCashAmount.toFixed(2),
        countedAmount: countedAmount.toFixed(2),
        difference: difference.toFixed(2),
      },
    },
  });

  logger.info("Conferência de caixa solicitada", {
    organizationId,
    cashRegisterDayId: closed.id,
    expectedCashAmount: expectedCashAmount.toFixed(2),
    countedAmount: countedAmount.toFixed(2),
    difference: difference.toFixed(2),
  });

  return closed;
}
