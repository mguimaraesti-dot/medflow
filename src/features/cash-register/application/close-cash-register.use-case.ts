import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import { CashRegisterNotOpenError } from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "../domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
  cashFlowEntryRepository: CashFlowEntryRepository;
}

/**
 * US07 — Fechamento de caixa.
 * totalIn/totalOut/closingBalance são SEMPRE calculados aqui a partir
 * dos lançamentos reais — nunca aceitos do cliente (Coding Standards,
 * "GET nunca altera estado" + nunca confiar em valor vindo de fora para
 * dado financeiro). Cálculo feito inteiramente com Prisma.Decimal, nunca
 * com `number`, para não introduzir erro de ponto flutuante em dinheiro.
 */
export async function closeCashRegisterUseCase(
  closedByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<CashRegisterDay> {
  const openRegister =
    await deps.cashRegisterDayRepository.findOpenByOrganization(organizationId);
  if (!openRegister) {
    throw new CashRegisterNotOpenError(organizationId);
  }

  const sums = await deps.cashFlowEntryRepository.sumByCashRegisterDay(
    openRegister.id,
  );

  const openingBalance = new Prisma.Decimal(openRegister.openingBalance);
  const totalIn = new Prisma.Decimal(sums.totalIn);
  const totalOut = new Prisma.Decimal(sums.totalOut);
  const closingBalance = openingBalance
    .plus(totalIn)
    .minus(totalOut)
    .toFixed(2);

  const closed = await deps.cashRegisterDayRepository.close(openRegister.id, {
    totalIn: sums.totalIn,
    totalOut: sums.totalOut,
    closingBalance,
    closedByUserId,
  });

  await prisma.auditLog.create({
    data: {
      userId: closedByUserId,
      entity: "CashRegisterDay",
      entityId: closed.id,
      action: "CASH_REGISTER_CLOSED",
      after: { totalIn: sums.totalIn, totalOut: sums.totalOut, closingBalance },
    },
  });

  logger.info("Caixa fechado", {
    organizationId,
    cashRegisterDayId: closed.id,
    closingBalance,
  });

  return closed;
}
