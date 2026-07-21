import { toMoneyString } from "@/shared/lib/money";
import type {
  DashboardOverview,
  DashboardCashRegisterStatus,
  DashboardPendencySeverity,
  DashboardTimelineTone,
  DashboardTimelineMethod,
} from "../../domain/dashboard-overview.entity";

export interface DashboardPendencyResponseDTO {
  code: string;
  severity: DashboardPendencySeverity;
  title: string;
  count: number | null;
  amount: string | null;
  href: string;
}

export interface DashboardTimelineEventResponseDTO {
  id: string;
  occurredAt: string;
  title: string;
  subtitle: string | null;
  tone: DashboardTimelineTone;
  amount: string | null;
  /** Só preenchido em recebimentos ("PIX" | "CASH"); `null` nos demais eventos da timeline. */
  method: DashboardTimelineMethod;
}

export interface DashboardOverviewResponseDTO {
  cashRegisterStatus: DashboardCashRegisterStatus;
  cashBalance: string;
  safeBalance: string;
  availableTotal: string;
  dueTodayCount: number;
  dueTodayAmount: string;
  overdueCount: number;
  overdueAmount: string;
  pendingConfirmationCount: number;
  pendingConfirmationAmount: string;
  receivedTodayTotal: string;
  receivedTodayCash: string;
  receivedTodayPix: string;
  receivedTodayCount: number;
  paidTodayAmount: string;
  paidTodayCount: number;
  pendencies: DashboardPendencyResponseDTO[];
  timeline: DashboardTimelineEventResponseDTO[];
}

export function toDashboardOverviewResponseDTO(
  overview: DashboardOverview,
): DashboardOverviewResponseDTO {
  return {
    cashRegisterStatus: overview.cashRegisterStatus,
    cashBalance: toMoneyString(overview.cashBalance) as string,
    safeBalance: toMoneyString(overview.safeBalance) as string,
    availableTotal: toMoneyString(overview.availableTotal) as string,
    dueTodayCount: overview.dueTodayCount,
    dueTodayAmount: toMoneyString(overview.dueTodayAmount) as string,
    overdueCount: overview.overdueCount,
    overdueAmount: toMoneyString(overview.overdueAmount) as string,
    pendingConfirmationCount: overview.pendingConfirmationCount,
    pendingConfirmationAmount: toMoneyString(
      overview.pendingConfirmationAmount,
    ) as string,
    receivedTodayTotal: toMoneyString(overview.receivedTodayTotal) as string,
    receivedTodayCash: toMoneyString(overview.receivedTodayCash) as string,
    receivedTodayPix: toMoneyString(overview.receivedTodayPix) as string,
    receivedTodayCount: overview.receivedTodayCount,
    paidTodayAmount: toMoneyString(overview.paidTodayAmount) as string,
    paidTodayCount: overview.paidTodayCount,
    pendencies: overview.pendencies.map((pendency) => ({
      code: pendency.code,
      severity: pendency.severity,
      title: pendency.title,
      count: pendency.count,
      amount: toMoneyString(pendency.amount),
      href: pendency.href,
    })),
    timeline: overview.timeline.map((event) => ({
      id: event.id,
      occurredAt: event.occurredAt.toISOString(),
      title: event.title,
      subtitle: event.subtitle,
      tone: event.tone,
      amount: toMoneyString(event.amount),
      method: event.method,
    })),
  };
}
