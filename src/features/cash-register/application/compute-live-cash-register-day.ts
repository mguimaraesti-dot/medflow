import { Prisma } from "@prisma/client";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";

interface Deps {
  cashFlowEntryRepository: CashFlowEntryRepository;
  safeMovementRepository: SafeMovementRepository;
}

/**
 * Completa `totalIn`/`totalOut`/`expectedCashAmount`/`cashIn` "ao vivo"
 * pra um `CashRegisterDay` `OPEN` — esses campos só existem gravados no
 * banco depois do fechamento. Mesma fórmula do fechamento real
 * (`close-cash-register.use-case.ts`): Saldo Inicial + Entradas em
 * dinheiro − Saídas em dinheiro − Sangrias. As agregações são genéricas
 * por `cashRegisterDayId`, nunca amarradas a "hoje" — por isso este
 * helper é compartilhado por `getTodayCashRegisterUseCase` (resolve por
 * data exata) e `getPreviousDayOpenRegisterUseCase` (resolve o caixa
 * esquecido de dia anterior, ver `PreviousDayCashRegisterOpenError`).
 * `CLOSED` retorna o dia sem tocar nos repositórios — os campos já
 * estão gravados desde o fechamento.
 */
export async function computeLiveCashRegisterDay(
  day: CashRegisterDay,
  deps: Deps,
): Promise<CashRegisterDay> {
  if (day.status !== "OPEN") return day;

  const [sums, cashSums, sangriaTotal] = await Promise.all([
    deps.cashFlowEntryRepository.sumByCashRegisterDay(day.id),
    deps.cashFlowEntryRepository.sumCashOnlyByCashRegisterDay(day.id),
    deps.safeMovementRepository.sumByCashRegisterDayAndType(day.id, "SANGRIA"),
  ]);

  const expectedCashAmount = new Prisma.Decimal(day.openingBalance)
    .plus(new Prisma.Decimal(cashSums.totalIn))
    .minus(new Prisma.Decimal(cashSums.totalOut))
    .minus(new Prisma.Decimal(sangriaTotal));

  return {
    ...day,
    totalIn: new Prisma.Decimal(sums.totalIn),
    totalOut: new Prisma.Decimal(sums.totalOut),
    expectedCashAmount,
    cashIn: new Prisma.Decimal(cashSums.totalIn),
  };
}
