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
 * Fecha direto para `CLOSED` — dupla conferência do Motor de
 * Tesouraria removida por decisão explícita (a secretária tem
 * autonomia de fechar e reabrir sozinha, sempre com justificativa; o
 * Cofre deixou de ser movimentado automaticamente por este fluxo).
 * `expectedCashAmount`/`difference` são SEMPRE calculados aqui a partir
 * dos lançamentos reais — nunca aceitos do cliente. `countedAmount` é a
 * única entrada do usuário.
 *
 * Dinheiro Esperado = Saldo Inicial + Entradas em dinheiro
 *                      − Saídas em dinheiro − Sangrias do dia.
 * `totalIn`/`totalOut`/`closingBalance` são o saldo contábil (todas as
 * formas de pagamento, não só dinheiro físico).
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

  const [cashSums, sangriaTotal, allSums] = await Promise.all([
    deps.cashFlowEntryRepository.sumCashOnlyByCashRegisterDay(openRegister.id),
    deps.safeMovementRepository.sumByCashRegisterDayAndType(
      openRegister.id,
      "SANGRIA",
    ),
    deps.cashFlowEntryRepository.sumByCashRegisterDay(openRegister.id),
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

  const totalIn = new Prisma.Decimal(allSums.totalIn);
  const totalOut = new Prisma.Decimal(allSums.totalOut);
  const closingBalance = openingBalance.plus(totalIn).minus(totalOut);

  const closed = await deps.cashRegisterDayRepository.close(openRegister.id, {
    expectedCashAmount: expectedCashAmount.toFixed(2),
    countedAmount: countedAmount.toFixed(2),
    difference: difference.toFixed(2),
    totalIn: totalIn.toFixed(2),
    totalOut: totalOut.toFixed(2),
    closingBalance: closingBalance.toFixed(2),
    closureNote: input.closureNote,
    closedByUserId,
  });

  await prisma.auditLog.create({
    data: {
      userId: closedByUserId,
      entity: "CashRegisterDay",
      entityId: closed.id,
      action: "CASH_REGISTER_CLOSED",
      after: {
        expectedCashAmount: expectedCashAmount.toFixed(2),
        countedAmount: countedAmount.toFixed(2),
        difference: difference.toFixed(2),
      },
    },
  });

  logger.info("Caixa fechado", {
    organizationId,
    cashRegisterDayId: closed.id,
    expectedCashAmount: expectedCashAmount.toFixed(2),
    countedAmount: countedAmount.toFixed(2),
    difference: difference.toFixed(2),
  });

  return closed;
}
