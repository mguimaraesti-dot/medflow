"use client";

import { useAccountsPayableSummary } from "./use-accounts-payable-summary";
import type { PeriodRange } from "@/shared/components/period-selector";
import type { AccountsPayableSummaryResponseDTO } from "../application/dtos/accounts-payable-summary.response-dto";

/** Período imediatamente anterior, com a mesma duração — usado só para o comparativo dos cards. */
function getPreviousRange(range: PeriodRange): PeriodRange {
  const durationMs = range.to.getTime() - range.from.getTime();
  const to = new Date(range.from.getTime() - 1);
  const from = new Date(to.getTime() - durationMs);
  return { from, to };
}

/** null quando não há base de comparação confiável (período anterior zerado). */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export type AccountsPayableSummaryTrend = Record<
  "total" | "upcoming" | "overdue" | "paid",
  number | null
>;

/**
 * Reaproveita o endpoint de resumo já existente (chamando duas vezes — período
 * atual e o equivalente anterior) para calcular a variação percentual real dos
 * cards, sem precisar de um endpoint novo de comparação histórica.
 */
export function useAccountsPayableSummaryTrend(range: PeriodRange) {
  const previousRange = getPreviousRange(range);

  const current = useAccountsPayableSummary({
    dueDateFrom: range.from,
    dueDateTo: range.to,
  });
  const previous = useAccountsPayableSummary({
    dueDateFrom: previousRange.from,
    dueDateTo: previousRange.to,
  });

  const trend = computeTrend(current.data, previous.data);

  return {
    summary: current.data,
    trend,
    isLoading: current.isLoading,
  };
}

function computeTrend(
  current?: AccountsPayableSummaryResponseDTO,
  previous?: AccountsPayableSummaryResponseDTO,
): AccountsPayableSummaryTrend | null {
  if (!current || !previous) return null;

  return {
    total: pctChange(
      Number(current.total.amount),
      Number(previous.total.amount),
    ),
    upcoming: pctChange(
      Number(current.upcoming.amount),
      Number(previous.upcoming.amount),
    ),
    overdue: pctChange(
      Number(current.overdue.amount),
      Number(previous.overdue.amount),
    ),
    paid: pctChange(Number(current.paid.amount), Number(previous.paid.amount)),
  };
}
