import { toMoneyString } from "@/shared/lib/money";
import type {
  RecurringBillHealthLevel,
  RecurringBillInsightKind,
  RecurringBillInsightsResult,
} from "../get-recurring-bill-insights.use-case";
import type { RecurrencePeriodicity } from "../../domain/recurring-bill.entity";

export interface RecurringBillInsightsResponseDTO {
  recurringBillId: string;
  active: boolean;
  periodicity: RecurrencePeriodicity;
  description: string;
  supplierId: string;
  categoryId: string;
  monthlyAmount: string;
  yearlyForecastAmount: string;
  startDate: Date | null;
  endDate: Date | null;
  nextGenerationDate: Date | null;
  occurrencesGenerated: number;
  occurrencesPaid: number;
  occurrencesPending: number;
  occurrencesOverdue: number;
  occurrencesCancelled: number;
  health: {
    status: RecurringBillHealthLevel;
    lastPaymentDate: Date | null;
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

export function toRecurringBillInsightsResponseDTO(
  result: RecurringBillInsightsResult,
): RecurringBillInsightsResponseDTO {
  return {
    recurringBillId: result.recurringBillId,
    active: result.active,
    periodicity: result.periodicity,
    description: result.description,
    supplierId: result.supplierId,
    categoryId: result.categoryId,
    monthlyAmount: toMoneyString(result.monthlyAmount) as string,
    yearlyForecastAmount: toMoneyString(result.yearlyForecastAmount) as string,
    startDate: result.startDate,
    endDate: result.endDate,
    nextGenerationDate: result.nextGenerationDate,
    occurrencesGenerated: result.occurrencesGenerated,
    occurrencesPaid: result.occurrencesPaid,
    occurrencesPending: result.occurrencesPending,
    occurrencesOverdue: result.occurrencesOverdue,
    occurrencesCancelled: result.occurrencesCancelled,
    health: result.health,
    insight: result.insight,
  };
}
