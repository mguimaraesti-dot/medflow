"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { RecurrencePeriodicity } from "./use-recurring-bill";

export type RecurringBillHealthLevel = "OK" | "ATTENTION" | "CRITICAL";
export type RecurringBillInsightKind =
  "HEALTHY" | "LATE_PATTERN" | "PRICE_INCREASE";

// Formato local, deliberadamente duplicado do DTO de recurring-bills — mesmo
// padrão já usado em use-recurring-bill.ts (não importamos código de outra
// feature, só a URL da API).
export interface RecurringBillInsights {
  recurringBillId: string;
  active: boolean;
  periodicity: RecurrencePeriodicity;
  description: string;
  supplierId: string;
  categoryId: string;
  monthlyAmount: string;
  yearlyForecastAmount: string;
  startDate: string | null;
  endDate: string | null;
  nextGenerationDate: string | null;
  occurrencesGenerated: number;
  occurrencesPaid: number;
  occurrencesPending: number;
  occurrencesOverdue: number;
  occurrencesCancelled: number;
  health: {
    status: RecurringBillHealthLevel;
    lastPaymentDate: string | null;
    punctualityPercent: number | null;
  };
  insight: {
    kind: RecurringBillInsightKind;
    recommendation: string;
    monthsOfHistory: number;
    onTimeCount: number;
    lateCount: number;
    averageLeadDays: number | null;
    recentLateCount?: number;
    recentWindowSize?: number;
    averageDelayDays?: number;
    increaseCount?: number;
    cumulativeChangePercent?: number;
  };
}

export function useRecurringBillInsights(recurringBillId: string | null) {
  return useQuery({
    queryKey: ["recurring-bills", "insights", recurringBillId],
    queryFn: () =>
      apiFetch<RecurringBillInsights>(
        `/api/recurring-bills/${recurringBillId}/insights`,
      ),
    enabled: recurringBillId !== null,
  });
}
