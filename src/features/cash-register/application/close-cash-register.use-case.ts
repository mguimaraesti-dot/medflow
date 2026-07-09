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
 * Fecha direto para `CLOSED` — a secretária tem autonomia de fechar e
 * reabrir sozinha, sempre com justificativa na reabertura; não há trava
 * nem dupla conferência neste passo. O repositório (`close()`), na mesma
 * transação, cria um `SafeMovement` `CASH_REGISTER_HANDOFF`/`PENDING`
 * com o `handoffAmount` (ver abaixo) — o dinheiro só passa a valer no
 * saldo do Cofre depois que um Gerente confirma a conferência física
 * (`confirm-safe-movement.use-case`). `expectedCashAmount`/`difference`
 * são SEMPRE calculados aqui a partir dos lançamentos reais — nunca
 * aceitos do cliente. `countedAmount` é a única entrada do usuário.
 *
 * Dinheiro Esperado = Saldo Inicial + Entradas em dinheiro
 *                      − Saídas em dinheiro − Sangrias do dia.
 * `totalIn`/`totalOut`/`closingBalance` são o saldo contábil (todas as
 * formas de pagamento, não só dinheiro físico).
 *
 * Reabertura (US08) mantém o mesmo `CashRegisterDay.id` — um dia pode
 * fechar mais de uma vez. `countedAmount`/`expectedCashAmount` continuam
 * cumulativos (o dinheiro nunca sai fisicamente da gaveta só porque o
 * Gerente confirmou no sistema), mas o valor do `SafeMovement` enviado à
 * Tesouraria (`handoffAmount`) precisa ser líquido do que já foi
 * confirmado em fechamentos anteriores do mesmo dia — senão cada
 * reabertura + fechamento reenvia o total acumulado (bug reportado:
 * R$1.000 confirmados, reabre, fecha de novo sem nada novo -> sistema
 * pedia R$1.000 de novo; com +R$200 -> pedia R$1.200 em vez de R$200).
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

  const [cashSums, sangriaTotal, allSums, alreadyHandedOff] = await Promise.all(
    [
      deps.cashFlowEntryRepository.sumCashOnlyByCashRegisterDay(
        openRegister.id,
      ),
      deps.safeMovementRepository.sumByCashRegisterDayAndType(
        openRegister.id,
        "SANGRIA",
      ),
      deps.cashFlowEntryRepository.sumByCashRegisterDay(openRegister.id),
      deps.safeMovementRepository.sumByCashRegisterDayAndType(
        openRegister.id,
        "CASH_REGISTER_HANDOFF",
        "CONFIRMED",
      ),
    ],
  );

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
  // Se o caixa já foi fechado e reaberto neste mesmo dia, o valor
  // enviado à Tesouraria é só o que ainda não foi confirmado — senão
  // cada novo fechamento reenvia o total acumulado do dia inteiro.
  const handoffAmount = countedAmount.minus(
    new Prisma.Decimal(alreadyHandedOff),
  );

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
    handoffAmount: handoffAmount.toFixed(2),
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
        handoffAmount: handoffAmount.toFixed(2),
      },
    },
  });

  logger.info("Caixa fechado", {
    organizationId,
    cashRegisterDayId: closed.id,
    expectedCashAmount: expectedCashAmount.toFixed(2),
    countedAmount: countedAmount.toFixed(2),
    difference: difference.toFixed(2),
    handoffAmount: handoffAmount.toFixed(2),
  });

  return closed;
}
