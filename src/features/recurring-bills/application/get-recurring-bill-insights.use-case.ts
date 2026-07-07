import { Prisma } from "@prisma/client";
import { NotFoundError } from "@/core/errors/domain-error";
import type { RecurringBillRepository } from "../domain/recurring-bill.repository";
import type { RecurrencePeriodicity } from "../domain/recurring-bill.entity";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { AccountsPayable } from "@/features/accounts-payable/domain/accounts-payable.entity";

interface Deps {
  recurringBillRepository: RecurringBillRepository;
  accountsPayableRepository: AccountsPayableRepository;
}

export type RecurringBillHealthLevel = "OK" | "ATTENTION" | "CRITICAL";
export type RecurringBillInsightKind =
  "HEALTHY" | "LATE_PATTERN" | "PRICE_INCREASE";

export interface RecurringBillInsightsResult {
  recurringBillId: string;
  active: boolean;
  periodicity: RecurrencePeriodicity;
  description: string;
  supplierId: string;
  categoryId: string;
  monthlyAmount: Prisma.Decimal;
  yearlyForecastAmount: Prisma.Decimal;
  startDate: Date | null;
  /** null = sem prazo (maxOccurrences não definido). */
  endDate: Date | null;
  /** Próxima ocorrência ainda não resolvida (pendente ou vencida) — null se a série já terminou. */
  nextGenerationDate: Date | null;
  occurrencesGenerated: number;
  occurrencesPaid: number;
  occurrencesPending: number;
  occurrencesOverdue: number;
  occurrencesCancelled: number;
  health: {
    status: RecurringBillHealthLevel;
    lastPaymentDate: Date | null;
    /** null = nenhuma ocorrência paga ainda. */
    punctualityPercent: number | null;
  };
  insight: {
    kind: RecurringBillInsightKind;
    recommendation: string;
    monthsOfHistory: number;
    onTimeCount: number;
    lateCount: number;
    /** Média de dias de antecedência do pagamento (negativo = atraso médio). Null sem histórico de pagamento. */
    averageLeadDays: number | null;
    recentLateCount?: number;
    recentWindowSize?: number;
    averageDelayDays?: number;
    increaseCount?: number;
    cumulativeChangePercent?: number;
  };
}

const OCCURRENCES_PER_YEAR: Record<RecurrencePeriodicity, number> = {
  WEEKLY: 52,
  BIWEEKLY: 26,
  MONTHLY: 12,
  YEARLY: 1,
};

/** Duplicado de propósito — mesma lógica usada em create-recurring-accounts-payable.use-case.ts (accounts-payable) e accounts-payable-helpers.ts (presentation); features não se importam entre si. */
function addPeriod(
  date: Date,
  periodicity: RecurrencePeriodicity,
  times: number,
): Date {
  const result = new Date(date);
  switch (periodicity) {
    case "WEEKLY":
      result.setUTCDate(result.getUTCDate() + 7 * times);
      return result;
    case "BIWEEKLY":
      result.setUTCDate(result.getUTCDate() + 14 * times);
      return result;
    case "YEARLY":
      result.setUTCFullYear(result.getUTCFullYear() + times);
      return result;
    case "MONTHLY":
    default:
      result.setUTCMonth(result.getUTCMonth() + times);
      return result;
  }
}

function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** Ocorrência "em atraso" = já vencida sem pagamento (ainda pendente) ou paga depois do vencimento. */
function isLate(payable: AccountsPayable, today: Date): boolean {
  if (payable.status === "PAID") {
    return payable.paidAt !== null && payable.paidAt > payable.dueDate;
  }
  return payable.status === "PENDING" && payable.dueDate < today;
}

export async function getRecurringBillInsightsUseCase(
  recurringBillId: string,
  organizationId: string,
  deps: Deps,
): Promise<RecurringBillInsightsResult> {
  const bill = await deps.recurringBillRepository.findById(recurringBillId);
  if (!bill || bill.organizationId !== organizationId) {
    throw new NotFoundError("Recorrência", recurringBillId);
  }

  const siblings =
    await deps.accountsPayableRepository.listByRecurringBill(recurringBillId);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const paid = siblings.filter((s) => s.status === "PAID");
  const cancelled = siblings.filter((s) => s.status === "CANCELLED");
  const pending = siblings.filter(
    (s) => s.status === "PENDING" && s.dueDate >= today,
  );
  const overdue = siblings.filter(
    (s) => s.status === "PENDING" && s.dueDate < today,
  );

  const unresolvedSorted = siblings
    .filter((s) => s.status === "PENDING")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const nextGenerationDate = unresolvedSorted[0]?.dueDate ?? null;

  const startDate = bill.firstDueDate;
  const endDate =
    bill.maxOccurrences && bill.firstDueDate
      ? addPeriod(bill.firstDueDate, bill.periodicity, bill.maxOccurrences - 1)
      : null;

  const yearlyForecastAmount = bill.amount.times(
    OCCURRENCES_PER_YEAR[bill.periodicity],
  );

  // --- Saúde da recorrência ---
  const total = siblings.length;
  const unresolvedRatio =
    total > 0 ? (pending.length + overdue.length) / total : 0;
  let healthStatus: RecurringBillHealthLevel;
  if (overdue.length > 3 || unresolvedRatio > 0.2) {
    healthStatus = "CRITICAL";
  } else if (overdue.length >= 1 || pending.length > 2) {
    healthStatus = "ATTENTION";
  } else {
    healthStatus = "OK";
  }

  const lastPaymentDate =
    paid.length > 0
      ? paid.reduce(
          (latest, p) =>
            p.paidAt && (!latest || p.paidAt > latest) ? p.paidAt : latest,
          null as Date | null,
        )
      : null;

  const onTimePaid = paid.filter((p) => p.paidAt && p.paidAt <= p.dueDate);
  const punctualityPercent =
    paid.length > 0
      ? Math.round((onTimePaid.length / paid.length) * 100)
      : null;

  // --- Insight automático ---
  const elapsed = siblings.filter((s) => s.dueDate <= today);
  const monthsOfHistory = elapsed.length;
  const onTimeCount = onTimePaid.length;
  const lateCount = siblings.filter((s) => isLate(s, today)).length;
  const averageLeadDays =
    paid.length > 0
      ? Math.round(
          paid.reduce(
            (sum, p) => sum + (p.paidAt ? daysBetween(p.paidAt, p.dueDate) : 0),
            0,
          ) / paid.length,
        )
      : null;

  // Janela recente (últimas até 6 ocorrências já vencidas/resolvidas).
  const recentWindow = elapsed.slice(-6);
  const recentLate = recentWindow.filter((s) => isLate(s, today));

  // Comparação de valor entre ocorrências consecutivas (últimas até 12) — hoje
  // toda ocorrência de uma recorrência nasce com o mesmo valor (geração em
  // lote usa um valor único), então esta branch nunca dispara na prática;
  // mantida para o dia em que edição de valor por ocorrência existir.
  const recentForPrice = siblings.slice(-12);
  let increaseCount = 0;
  for (let i = 1; i < recentForPrice.length; i++) {
    if (recentForPrice[i].amount.greaterThan(recentForPrice[i - 1].amount)) {
      increaseCount++;
    }
  }
  const cumulativeChangePercent =
    recentForPrice.length > 1 && recentForPrice[0].amount.greaterThan(0)
      ? recentForPrice[recentForPrice.length - 1].amount
          .minus(recentForPrice[0].amount)
          .dividedBy(recentForPrice[0].amount)
          .times(100)
          .toNumber()
      : 0;

  let insight: RecurringBillInsightsResult["insight"];

  if (recentLate.length >= 3) {
    const averageDelayDays = Math.round(
      recentLate.reduce((sum, s) => {
        const resolvedAt = s.status === "PAID" ? s.paidAt! : today;
        return sum + daysBetween(s.dueDate, resolvedAt);
      }, 0) / recentLate.length,
    );
    insight = {
      kind: "LATE_PATTERN",
      monthsOfHistory,
      onTimeCount,
      lateCount,
      averageLeadDays,
      recentLateCount: recentLate.length,
      recentWindowSize: recentWindow.length,
      averageDelayDays,
      recommendation: `Antecipar o lembrete automático via WhatsApp para ${Math.max(averageDelayDays, 1)} dias antes do vencimento.`,
    };
  } else if (increaseCount >= 2) {
    insight = {
      kind: "PRICE_INCREASE",
      monthsOfHistory,
      onTimeCount,
      lateCount,
      averageLeadDays,
      increaseCount,
      cumulativeChangePercent: Math.round(cumulativeChangePercent),
      recommendation: "Avaliar renegociação com o beneficiário.",
    };
  } else {
    insight = {
      kind: "HEALTHY",
      monthsOfHistory,
      onTimeCount,
      lateCount,
      averageLeadDays,
      recommendation:
        healthStatus === "OK"
          ? "Nenhuma ação necessária."
          : "Acompanhar mais de perto os próximos vencimentos.",
    };
  }

  return {
    recurringBillId: bill.id,
    active: bill.active,
    periodicity: bill.periodicity,
    description: bill.description,
    supplierId: bill.supplierId,
    categoryId: bill.categoryId,
    monthlyAmount: bill.amount,
    yearlyForecastAmount,
    startDate,
    endDate,
    nextGenerationDate,
    occurrencesGenerated: total,
    occurrencesPaid: paid.length,
    occurrencesPending: pending.length,
    occurrencesOverdue: overdue.length,
    occurrencesCancelled: cancelled.length,
    health: {
      status: healthStatus,
      lastPaymentDate,
      punctualityPercent,
    },
    insight,
  };
}
