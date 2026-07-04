import { Prisma } from "@prisma/client";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type {
  DashboardSummary,
  DashboardDailyTotal,
} from "../domain/dashboard-summary.entity";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
  cashFlowEntryRepository: CashFlowEntryRepository;
  /** Injetado só para permitir teste determinístico — em produção é sempre `new Date()`. */
  referenceDate?: Date;
}

const DAILY_SERIES_LENGTH = 30;

function toUtcMidnight(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * US09 — Resumo do Dashboard: saldo atual, receitas/despesas/resultado de
 * hoje, resultado do mês corrente e série dos últimos 30 dias.
 *
 * "Hoje" é calculado em UTC puro, mesma convenção já usada em
 * `src/app/api/cash-register/today/route.ts` (Task 5A) — não introduz uma
 * segunda forma de calcular o "dia de caixa".
 */
export async function getDashboardSummaryUseCase(
  organizationId: string,
  deps: Deps,
): Promise<DashboardSummary> {
  const today = toUtcMidnight(deps.referenceDate ?? new Date());
  const monthStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );

  const windowStart = new Date(today);
  windowStart.setUTCDate(windowStart.getUTCDate() - (DAILY_SERIES_LENGTH - 1));

  const rangeStart = windowStart < monthStart ? windowStart : monthStart;

  const endOfToday = new Date(today);
  endOfToday.setUTCHours(23, 59, 59, 999);

  const todayRegister =
    await deps.cashRegisterDayRepository.findByOrganizationAndDate(
      organizationId,
      today,
    );

  let currentBalance: Prisma.Decimal;
  let cashRegisterStatus: DashboardSummary["cashRegisterStatus"];
  let revenueToday = new Prisma.Decimal(0);
  let expensesToday = new Prisma.Decimal(0);

  if (todayRegister) {
    const sums = await deps.cashFlowEntryRepository.sumByCashRegisterDay(
      todayRegister.id,
    );
    revenueToday = new Prisma.Decimal(sums.totalIn);
    expensesToday = new Prisma.Decimal(sums.totalOut);

    if (todayRegister.status === "OPEN") {
      currentBalance = new Prisma.Decimal(todayRegister.openingBalance)
        .plus(revenueToday)
        .minus(expensesToday);
      cashRegisterStatus = "OPEN";
    } else {
      currentBalance = new Prisma.Decimal(todayRegister.closingBalance ?? 0);
      cashRegisterStatus = "CLOSED";
    }
  } else {
    const lastClosed =
      await deps.cashRegisterDayRepository.findLastClosed(organizationId);
    currentBalance = lastClosed
      ? new Prisma.Decimal(lastClosed.closingBalance ?? 0)
      : new Prisma.Decimal(0);
    cashRegisterStatus = "NOT_OPENED";
  }

  const resultToday = revenueToday.minus(expensesToday);

  const entries = await deps.cashFlowEntryRepository.listByDateRange(
    organizationId,
    rangeStart,
    endOfToday,
  );

  const totalsByDay = new Map<
    string,
    { totalIn: Prisma.Decimal; totalOut: Prisma.Decimal }
  >();
  let resultMonth = new Prisma.Decimal(0);

  for (const entry of entries) {
    const key = dayKey(entry.occurredAt);
    const bucket = totalsByDay.get(key) ?? {
      totalIn: new Prisma.Decimal(0),
      totalOut: new Prisma.Decimal(0),
    };

    if (entry.type === "IN") {
      bucket.totalIn = bucket.totalIn.plus(entry.amount);
    } else {
      bucket.totalOut = bucket.totalOut.plus(entry.amount);
    }
    totalsByDay.set(key, bucket);

    if (entry.occurredAt >= monthStart) {
      resultMonth =
        entry.type === "IN"
          ? resultMonth.plus(entry.amount)
          : resultMonth.minus(entry.amount);
    }
  }

  const dailySeries: DashboardDailyTotal[] = [];
  for (let i = DAILY_SERIES_LENGTH - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    const bucket = totalsByDay.get(dayKey(date)) ?? {
      totalIn: new Prisma.Decimal(0),
      totalOut: new Prisma.Decimal(0),
    };
    dailySeries.push({
      date,
      totalIn: bucket.totalIn,
      totalOut: bucket.totalOut,
    });
  }

  const recent = await deps.cashFlowEntryRepository.list(
    { organizationId },
    { page: 1, pageSize: 5 },
  );

  return {
    currentBalance,
    cashRegisterStatus,
    revenueToday,
    expensesToday,
    resultToday,
    resultMonth,
    dailySeries,
    recentEntries: recent.items,
  };
}
