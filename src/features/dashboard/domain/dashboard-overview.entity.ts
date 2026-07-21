import type { Prisma } from "@prisma/client";

export type DashboardCashRegisterStatus = "OPEN" | "CLOSED" | "NOT_OPENED";

export type DashboardPendencySeverity = "critical" | "warning" | "info";

export interface DashboardPendency {
  code: string;
  severity: DashboardPendencySeverity;
  /** Já pronto pra exibir (inclui contagem pluralizada) — nunca embute valores monetários (formatação BRL é sempre no frontend). */
  title: string;
  /** Contagem associada (ex: nº de contas), quando o `code` for baseado em contagem — `null` caso contrário. */
  count: number | null;
  /** Valor monetário associado, quando aplicável — a formatação BRL é sempre feita no frontend (`formatCurrencyBRL`). */
  amount: Prisma.Decimal | null;
  /** Rota pra onde o botão "Resolver" leva. */
  href: string;
}

export type DashboardTimelineTone =
  "green" | "red" | "blue" | "yellow" | "neutral";

/** Método de pagamento normalizado pra UI — só preenchido em eventos de recebimento (`null` nos demais: abertura de caixa, sangria etc.). */
export type DashboardTimelineMethod = "PIX" | "CASH" | null;

export interface DashboardTimelineEvent {
  id: string;
  occurredAt: Date;
  title: string;
  /** Texto complementar plano (nome, motivo) — nunca embute valores monetários formatados. */
  subtitle: string | null;
  tone: DashboardTimelineTone;
  /** Já com o sinal correto (negativo pra saída) — `null` quando o evento não representa um valor (ex: abertura de caixa). Formatação BRL é sempre no frontend. */
  amount: Prisma.Decimal | null;
  method: DashboardTimelineMethod;
}

/**
 * Visão geral do novo Dashboard (redesign aprovado) — substitui
 * `DashboardSummary` + `DashboardAlerts`. Une KPIs, pendências acionáveis,
 * o fluxo financeiro do dia e a timeline de movimentações recentes numa
 * única leitura agregada.
 */
export interface DashboardOverview {
  cashRegisterStatus: DashboardCashRegisterStatus;

  /** Saldo físico em dinheiro na Caixa Recepção agora — 0 quando o caixa está fechado (dinheiro contado já foi recolhido ao Cofre) ou não foi aberto hoje. */
  cashBalance: Prisma.Decimal;
  safeBalance: Prisma.Decimal;
  /** cashBalance + safeBalance — mesma soma usada na Disponibilidade Financeira e no Saldo Disponível do Fluxo. */
  availableTotal: Prisma.Decimal;

  dueTodayCount: number;
  dueTodayAmount: Prisma.Decimal;
  overdueCount: number;
  overdueAmount: Prisma.Decimal;

  pendingConfirmationCount: number;
  pendingConfirmationAmount: Prisma.Decimal;

  receivedTodayTotal: Prisma.Decimal;
  receivedTodayCash: Prisma.Decimal;
  receivedTodayPix: Prisma.Decimal;
  receivedTodayCount: number;

  paidTodayAmount: Prisma.Decimal;
  paidTodayCount: number;

  pendencies: DashboardPendency[];
  timeline: DashboardTimelineEvent[];
}
