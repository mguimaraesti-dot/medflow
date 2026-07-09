import { Prisma } from "@prisma/client";
import { getBusinessDay } from "@/shared/lib/business-day";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { SafeMovement } from "@/features/treasury/domain/safe-movement.entity";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type {
  DashboardOverview,
  DashboardPendency,
  DashboardTimelineEvent,
} from "../domain/dashboard-overview.entity";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
  cashFlowEntryRepository: CashFlowEntryRepository;
  safeMovementRepository: SafeMovementRepository;
  safeRepository: SafeRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
  accountsPayableRepository: AccountsPayableRepository;
  /** Injetado só para permitir teste determinístico — em produção é sempre `new Date()`. */
  referenceDate?: Date;
}

const DEFAULT_TIMEZONE = "America/Sao_Paulo";
const DEFAULT_OPENING_TIME = "08:00";
const TIMELINE_LIMIT = 8;

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

/** Comparação simples em UTC — mesma simplificação de horário já usada no restante do sistema (Task 5A). */
function isAfterTime(now: Date, hhmm: string): boolean {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return nowMinutes >= hours * 60 + minutes;
}

const SAFE_MOVEMENT_EVENT_LIMIT = 8;
const CASH_FLOW_EVENT_LIMIT = 8;

function safeMovementToTimelineEvent(
  movement: SafeMovement,
): DashboardTimelineEvent {
  const base = {
    id: `safe-movement-${movement.id}`,
    occurredAt: movement.createdAt,
  };

  switch (movement.type) {
    case "CASH_REGISTER_HANDOFF":
      if (movement.status === "PENDING") {
        return {
          ...base,
          title: "Recolhimento enviado à Tesouraria",
          subtitle: `Aguardando confirmação — enviado por ${movement.performedByUserName}`,
          tone: "yellow",
          amount: null,
        };
      }
      if (movement.status === "CANCELLED") {
        return {
          ...base,
          title: "Recolhimento rejeitado",
          subtitle: movement.cancelReason,
          tone: "red",
          amount: null,
        };
      }
      return {
        ...base,
        title: "Tesouraria recebeu o caixa",
        subtitle: `Confirmado por ${movement.confirmedByUserName ?? movement.performedByUserName}`,
        tone: "blue",
        amount: movement.amount,
      };

    case "ACCOUNTS_PAYABLE_PAYMENT":
      return {
        ...base,
        title: "Conta paga via Cofre",
        subtitle: movement.reason,
        tone: "red",
        amount: movement.amount.negated(),
      };

    case "SANGRIA":
      return {
        ...base,
        title: "Retirada do Cofre",
        subtitle: movement.reason,
        tone: "red",
        amount: movement.amount.negated(),
      };

    case "FUNDING":
      return {
        ...base,
        title: "Abertura de caixa — saldo retirado do Cofre",
        subtitle: movement.reason,
        tone: "red",
        amount: movement.amount.negated(),
      };

    case "MANUAL_ADJUSTMENT":
      return {
        ...base,
        title: "Ajuste manual do Cofre",
        subtitle: movement.reason,
        tone: movement.amount.isNegative() ? "red" : "green",
        amount: movement.amount,
      };
  }
}

/**
 * US-Dashboard v2 — visão geral do redesign aprovado. Combina KPIs
 * (saldo em dinheiro da Caixa Recepção, saldo do Cofre, contas a pagar),
 * pendências acionáveis e uma timeline unificada (caixa + lançamentos +
 * movimentações do Cofre), substituindo `get-dashboard-summary` +
 * `get-dashboard-alerts`.
 */
export async function getDashboardOverviewUseCase(
  organizationId: string,
  deps: Deps,
): Promise<DashboardOverview> {
  const now = deps.referenceDate ?? new Date();
  const settings =
    await deps.organizationSettingsRepository.findByOrganization(
      organizationId,
    );
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const openingTime = settings?.openingTime ?? DEFAULT_OPENING_TIME;
  const today = getBusinessDay(timezone, now);
  const endOfToday = endOfDay(today);

  const [
    todayRegister,
    safeBalance,
    payableSummary,
    paidToday,
    pendingConfirmation,
    reversedCount,
  ] = await Promise.all([
    deps.cashRegisterDayRepository.findByOrganizationAndDate(
      organizationId,
      today,
    ),
    deps.safeRepository.getBalance(organizationId),
    deps.accountsPayableRepository.getSummary(organizationId, {}),
    deps.accountsPayableRepository.sumPaidByDateRange(
      organizationId,
      today,
      endOfToday,
    ),
    deps.safeMovementRepository.countAndSumPending(organizationId),
    deps.cashFlowEntryRepository.countReversedToday(
      organizationId,
      today,
      endOfToday,
    ),
  ]);

  let cashBalance = new Prisma.Decimal(0);
  let receivedTodayTotal = new Prisma.Decimal(0);
  let receivedTodayCash = new Prisma.Decimal(0);
  let receivedTodayCount = 0;
  const cashFlowTimelineEvents: DashboardTimelineEvent[] = [];

  if (todayRegister) {
    const [allSums, cashOnlySums, entries, recentEntries] = await Promise.all([
      deps.cashFlowEntryRepository.sumByCashRegisterDay(todayRegister.id),
      deps.cashFlowEntryRepository.sumCashOnlyByCashRegisterDay(
        todayRegister.id,
      ),
      deps.cashFlowEntryRepository.listByCashRegisterDay(todayRegister.id),
      deps.cashFlowEntryRepository.list(
        { organizationId, cashRegisterDayId: todayRegister.id },
        { page: 1, pageSize: CASH_FLOW_EVENT_LIMIT },
      ),
    ]);

    receivedTodayTotal = new Prisma.Decimal(allSums.totalIn);
    receivedTodayCash = new Prisma.Decimal(cashOnlySums.totalIn);
    receivedTodayCount = entries.filter((entry) => entry.type === "IN").length;

    if (todayRegister.status === "OPEN") {
      const sangriaTotal =
        await deps.safeMovementRepository.sumByCashRegisterDayAndType(
          todayRegister.id,
          "SANGRIA",
        );
      cashBalance = new Prisma.Decimal(todayRegister.openingBalance)
        .plus(new Prisma.Decimal(cashOnlySums.totalIn))
        .minus(new Prisma.Decimal(cashOnlySums.totalOut))
        .minus(new Prisma.Decimal(sangriaTotal));
    }
    // CLOSED: o dinheiro contado já foi recolhido ao Cofre (handoff) —
    // fisicamente não sobra nada na gaveta da Recepção.

    cashFlowTimelineEvents.push(
      {
        id: `register-open-${todayRegister.id}`,
        occurredAt: todayRegister.openedAt,
        title: "Caixa da Recepção aberto",
        subtitle: todayRegister.openedByUserName,
        tone: "neutral",
        amount: null,
      },
      ...(todayRegister.reopenedAt
        ? [
            {
              id: `register-reopen-${todayRegister.id}`,
              occurredAt: todayRegister.reopenedAt,
              title: "Caixa da Recepção reaberto",
              subtitle: todayRegister.reopenedByUserName,
              tone: "neutral" as const,
              amount: null,
            },
          ]
        : []),
      ...(todayRegister.closedAt
        ? [
            {
              id: `register-close-${todayRegister.id}`,
              occurredAt: todayRegister.closedAt,
              title: "Caixa da Recepção fechado",
              subtitle: "Saldo final",
              tone: "neutral" as const,
              amount: todayRegister.closingBalance
                ? new Prisma.Decimal(todayRegister.closingBalance)
                : null,
            },
          ]
        : []),
      ...(todayRegister.closedAt &&
      todayRegister.difference &&
      !new Prisma.Decimal(todayRegister.difference).isZero()
        ? [
            {
              id: `register-diff-${todayRegister.id}`,
              occurredAt: todayRegister.closedAt,
              title: "Diferença de caixa",
              subtitle: "Diferença encontrada",
              tone: new Prisma.Decimal(todayRegister.difference).isNegative()
                ? ("red" as const)
                : ("yellow" as const),
              amount: new Prisma.Decimal(todayRegister.difference),
            },
          ]
        : []),
      ...recentEntries.items.map((entry): DashboardTimelineEvent => ({
        id: `cash-flow-${entry.id}`,
        occurredAt: entry.occurredAt,
        title: entry.type === "IN" ? "Recebimento" : "Saída do caixa",
        subtitle: entry.patientName ?? entry.withdrawalReason ?? null,
        tone: entry.type === "IN" ? "green" : "red",
        amount: entry.type === "IN" ? entry.amount : entry.amount.negated(),
      })),
    );
  }

  const receivedTodayPix = receivedTodayTotal.minus(receivedTodayCash);
  const availableTotal = cashBalance.plus(safeBalance);

  const safeMovementsToday = await deps.safeMovementRepository.list(
    { organizationId, createdAtFrom: today, createdAtTo: endOfToday },
    { page: 1, pageSize: SAFE_MOVEMENT_EVENT_LIMIT },
  );

  const timeline = [
    ...cashFlowTimelineEvents,
    ...safeMovementsToday.items.map(safeMovementToTimelineEvent),
  ]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, TIMELINE_LIMIT);

  const cashRegisterStatus = !todayRegister
    ? ("NOT_OPENED" as const)
    : todayRegister.status === "OPEN"
      ? ("OPEN" as const)
      : ("CLOSED" as const);

  const pendencies: DashboardPendency[] = [];

  if (payableSummary.overdue.count > 0) {
    pendencies.push({
      code: "OVERDUE_PAYABLES",
      severity: "critical",
      title:
        payableSummary.overdue.count === 1
          ? "1 conta vencida"
          : `${payableSummary.overdue.count} contas vencidas`,
      count: payableSummary.overdue.count,
      amount: payableSummary.overdue.amount,
      href: "/accounts-payable",
    });
  }

  if (pendingConfirmation.count > 0) {
    pendencies.push({
      code: "PENDING_TREASURY_CONFIRMATION",
      severity: "warning",
      title: "Confirmar recebimento da Tesouraria",
      count: pendingConfirmation.count,
      amount: new Prisma.Decimal(pendingConfirmation.sum),
      href: "/treasury",
    });
  }

  if (payableSummary.dueToday.count > 0) {
    pendencies.push({
      code: "DUE_TODAY_PAYABLES",
      severity: "warning",
      title:
        payableSummary.dueToday.count === 1
          ? "1 conta vence hoje"
          : `${payableSummary.dueToday.count} contas vencem hoje`,
      count: payableSummary.dueToday.count,
      amount: payableSummary.dueToday.amount,
      href: "/accounts-payable",
    });
  }

  if (cashRegisterStatus === "NOT_OPENED" && isAfterTime(now, openingTime)) {
    pendencies.push({
      code: "CASH_REGISTER_NOT_OPENED",
      severity: "info",
      title: "Abrir caixa da recepção",
      count: null,
      amount: null,
      href: "/cash-flow",
    });
  }

  if (reversedCount > 0) {
    pendencies.push({
      code: "REVERSED_ENTRIES_TODAY",
      severity: "info",
      title:
        reversedCount === 1
          ? "1 lançamento estornado hoje"
          : `${reversedCount} lançamentos estornados hoje`,
      count: reversedCount,
      amount: null,
      href: "/cash-flow",
    });
  }

  return {
    cashRegisterStatus,
    cashBalance,
    safeBalance,
    availableTotal,
    dueTodayCount: payableSummary.dueToday.count,
    dueTodayAmount: payableSummary.dueToday.amount,
    overdueCount: payableSummary.overdue.count,
    overdueAmount: payableSummary.overdue.amount,
    pendingConfirmationCount: pendingConfirmation.count,
    pendingConfirmationAmount: new Prisma.Decimal(pendingConfirmation.sum),
    receivedTodayTotal,
    receivedTodayCash,
    receivedTodayPix,
    receivedTodayCount,
    paidTodayAmount: paidToday.amount,
    paidTodayCount: paidToday.count,
    pendencies,
    timeline,
  };
}
