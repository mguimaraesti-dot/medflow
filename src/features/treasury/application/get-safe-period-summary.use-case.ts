import { Prisma } from "@prisma/client";
import type { SafeRepository } from "../domain/safe.repository";
import type { SafeMovementRepository } from "../domain/safe-movement.repository";

interface Deps {
  safeRepository: SafeRepository;
  safeMovementRepository: SafeMovementRepository;
}

export interface SafePeriodSummary {
  /** Saldo do Cofre antes do início do período selecionado. */
  openingBalance: string;
  /** Saldo do Cofre ao final do período selecionado (openingBalance + entradas - saídas). */
  closingBalance: string;
  totalIn: string;
  totalOut: string;
}

/**
 * Núcleo do Relatório de Cofre: saldo inicial (tudo que aconteceu antes
 * de `dateFrom`) e saldo final do período — diferente de
 * `getSafeSummaryUseCase`, que só devolve o saldo *atual*. Reaproveita
 * `sumSignedByDateRangeAndStatus` (já existente) pro total de
 * entradas/saídas dentro do período.
 */
export async function getSafePeriodSummaryUseCase(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  deps: Deps,
): Promise<SafePeriodSummary> {
  const [openingBalance, periodSum] = await Promise.all([
    deps.safeRepository.getBalanceAsOf(organizationId, dateFrom),
    deps.safeMovementRepository.sumSignedByDateRangeAndStatus(
      organizationId,
      dateFrom,
      dateTo,
      "CONFIRMED",
    ),
  ]);

  const totalIn = new Prisma.Decimal(periodSum.in);
  const totalOut = new Prisma.Decimal(periodSum.out);
  const closingBalance = openingBalance.plus(totalIn).minus(totalOut);

  return {
    openingBalance: openingBalance.toFixed(2),
    closingBalance: closingBalance.toFixed(2),
    totalIn: totalIn.toFixed(2),
    totalOut: totalOut.toFixed(2),
  };
}
