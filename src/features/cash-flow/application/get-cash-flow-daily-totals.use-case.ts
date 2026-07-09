import { Prisma } from "@prisma/client";
import type { CashFlowEntryRepository } from "../domain/cash-flow-entry.repository";

export interface CashFlowDailyTotal {
  date: string; // "YYYY-MM-DD", dia calendário UTC (mesma convenção do resto do sistema)
  totalIn: Prisma.Decimal;
  totalOut: Prisma.Decimal;
  net: Prisma.Decimal;
}

export interface GetCashFlowDailyTotalsInput {
  dateFrom: Date;
  dateTo: Date;
}

interface Deps {
  cashFlowEntryRepository: CashFlowEntryRepository;
}

/**
 * Receitas x Despesas — Central de Relatórios (Financeiro). Totais
 * diários de entradas/saídas no período, agregados em código
 * (Coding Standards item 15) sobre `listByDateRange` — mesma projeção
 * já usada pelo Dashboard e por "Despesas por Categoria".
 */
export async function getCashFlowDailyTotalsUseCase(
  input: GetCashFlowDailyTotalsInput,
  organizationId: string,
  deps: Deps,
): Promise<CashFlowDailyTotal[]> {
  const entries = await deps.cashFlowEntryRepository.listByDateRange(
    organizationId,
    input.dateFrom,
    input.dateTo,
  );

  const totalsByDate = new Map<
    string,
    { totalIn: Prisma.Decimal; totalOut: Prisma.Decimal }
  >();

  for (const entry of entries) {
    const dateKey = entry.occurredAt.toISOString().slice(0, 10);
    const current = totalsByDate.get(dateKey) ?? {
      totalIn: new Prisma.Decimal(0),
      totalOut: new Prisma.Decimal(0),
    };
    if (entry.type === "IN") {
      current.totalIn = current.totalIn.plus(entry.amount);
    } else {
      current.totalOut = current.totalOut.plus(entry.amount);
    }
    totalsByDate.set(dateKey, current);
  }

  return Array.from(totalsByDate.entries())
    .map(([date, totals]) => ({
      date,
      totalIn: totals.totalIn,
      totalOut: totals.totalOut,
      net: totals.totalIn.minus(totals.totalOut),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
