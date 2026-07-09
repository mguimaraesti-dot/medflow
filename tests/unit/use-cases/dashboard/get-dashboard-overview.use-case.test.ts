import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getDashboardOverviewUseCase } from "@/features/dashboard/application/get-dashboard-overview.use-case";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";

const REFERENCE_DATE = new Date("2026-07-09T15:00:00.000Z");

function emptyPayableSummary() {
  return {
    total: { count: 0, amount: new Prisma.Decimal(0) },
    dueToday: { count: 0, amount: new Prisma.Decimal(0) },
    dueYesterday: { count: 0, amount: new Prisma.Decimal(0) },
    upcoming: { count: 0, amount: new Prisma.Decimal(0) },
    overdue: { count: 0, amount: new Prisma.Decimal(0) },
    paid: { count: 0, amount: new Prisma.Decimal(0) },
  };
}

function buildDeps(overrides: {
  todayRegister?: unknown;
  payableSummary?: ReturnType<typeof emptyPayableSummary>;
  pendingConfirmation?: { count: number; sum: string };
  reversedCount?: number;
  paidToday?: { count: number; amount: Prisma.Decimal };
  safeBalance?: Prisma.Decimal;
  allSums?: { totalIn: string; totalOut: string };
  cashOnlySums?: { totalIn: string; totalOut: string };
  entries?: Array<{ type: "IN" | "OUT" }>;
  recentEntries?: unknown[];
  sangriaTotal?: string;
  safeMovementsToday?: unknown[];
}) {
  const cashRegisterDayRepository = {
    findByOrganizationAndDate: vi
      .fn()
      .mockResolvedValue(overrides.todayRegister ?? null),
  } as unknown as CashRegisterDayRepository;

  const cashFlowEntryRepository = {
    sumByCashRegisterDay: vi
      .fn()
      .mockResolvedValue(overrides.allSums ?? { totalIn: "0", totalOut: "0" }),
    sumCashOnlyByCashRegisterDay: vi
      .fn()
      .mockResolvedValue(
        overrides.cashOnlySums ?? { totalIn: "0", totalOut: "0" },
      ),
    listByCashRegisterDay: vi.fn().mockResolvedValue(overrides.entries ?? []),
    list: vi
      .fn()
      .mockResolvedValue({ items: overrides.recentEntries ?? [], total: 0 }),
    countReversedToday: vi.fn().mockResolvedValue(overrides.reversedCount ?? 0),
  } as unknown as CashFlowEntryRepository;

  const safeMovementRepository = {
    sumByCashRegisterDayAndType: vi
      .fn()
      .mockResolvedValue(overrides.sangriaTotal ?? "0"),
    countAndSumPending: vi
      .fn()
      .mockResolvedValue(
        overrides.pendingConfirmation ?? { count: 0, sum: "0" },
      ),
    list: vi.fn().mockResolvedValue({
      items: overrides.safeMovementsToday ?? [],
      total: 0,
    }),
  } as unknown as SafeMovementRepository;

  const safeRepository = {
    getBalance: vi
      .fn()
      .mockResolvedValue(overrides.safeBalance ?? new Prisma.Decimal(0)),
  } as unknown as SafeRepository;

  const organizationSettingsRepository = {
    findByOrganization: vi.fn().mockResolvedValue({
      id: "settings-1",
      organizationId: "org-1",
      timezone: "America/Sao_Paulo",
      openingTime: "08:00",
      closingTime: "18:00",
    }),
  } as unknown as OrganizationSettingsRepository;

  const accountsPayableRepository = {
    getSummary: vi
      .fn()
      .mockResolvedValue(overrides.payableSummary ?? emptyPayableSummary()),
    sumPaidByDateRange: vi
      .fn()
      .mockResolvedValue(
        overrides.paidToday ?? { count: 0, amount: new Prisma.Decimal(0) },
      ),
  } as unknown as AccountsPayableRepository;

  return {
    cashRegisterDayRepository,
    cashFlowEntryRepository,
    safeMovementRepository,
    safeRepository,
    organizationSettingsRepository,
    accountsPayableRepository,
    referenceDate: REFERENCE_DATE,
  };
}

describe("getDashboardOverviewUseCase", () => {
  it("sem caixa aberto hoje: saldo em dinheiro zerado e pendência de abertura", async () => {
    const deps = buildDeps({});

    const result = await getDashboardOverviewUseCase("org-1", deps);

    expect(result.cashRegisterStatus).toBe("NOT_OPENED");
    expect(result.cashBalance.toString()).toBe("0");
    expect(
      result.pendencies.find((p) => p.code === "CASH_REGISTER_NOT_OPENED"),
    ).toBeDefined();
  });

  it("caixa aberto: saldo em dinheiro é abertura + dinheiro recebido - dinheiro pago - sangrias", async () => {
    const todayRegister = {
      id: "day-1",
      status: "OPEN",
      openingBalance: new Prisma.Decimal("500.00"),
      openedAt: new Date("2026-07-09T11:00:00.000Z"),
      openedByUserName: "Maria",
      reopenedAt: null,
      reopenedByUserName: null,
      closedAt: null,
      closingBalance: null,
      difference: null,
    };

    const deps = buildDeps({
      todayRegister,
      allSums: { totalIn: "800.00", totalOut: "0.00" },
      cashOnlySums: { totalIn: "300.00", totalOut: "50.00" },
      sangriaTotal: "20.00",
      entries: [{ type: "IN" }, { type: "IN" }, { type: "OUT" }],
      safeBalance: new Prisma.Decimal("1000.00"),
    });

    const result = await getDashboardOverviewUseCase("org-1", deps);

    expect(result.cashRegisterStatus).toBe("OPEN");
    expect(result.cashBalance.toFixed(2)).toBe("730.00");
    expect(result.receivedTodayTotal.toFixed(2)).toBe("800.00");
    expect(result.receivedTodayCash.toFixed(2)).toBe("300.00");
    expect(result.receivedTodayPix.toFixed(2)).toBe("500.00");
    expect(result.receivedTodayCount).toBe(2);
    expect(result.availableTotal.toFixed(2)).toBe("1730.00");
  });

  it("caixa fechado hoje: saldo em dinheiro é zero (já recolhido ao Cofre)", async () => {
    const todayRegister = {
      id: "day-1",
      status: "CLOSED",
      openingBalance: new Prisma.Decimal("500.00"),
      openedAt: new Date("2026-07-09T11:00:00.000Z"),
      openedByUserName: "Maria",
      reopenedAt: null,
      reopenedByUserName: null,
      closedAt: new Date("2026-07-09T14:00:00.000Z"),
      closingBalance: new Prisma.Decimal("1245.00"),
      difference: new Prisma.Decimal("-18.00"),
    };

    const deps = buildDeps({ todayRegister });

    const result = await getDashboardOverviewUseCase("org-1", deps);

    expect(result.cashRegisterStatus).toBe("CLOSED");
    expect(result.cashBalance.toString()).toBe("0");
    const diffEvent = result.timeline.find(
      (e) => e.title === "Diferença de caixa",
    );
    expect(diffEvent?.amount?.toFixed(2)).toBe("-18.00");
    expect(diffEvent?.tone).toBe("red");
  });

  it("pendências: contas vencidas, vencem hoje e confirmação pendente da Tesouraria", async () => {
    const deps = buildDeps({
      payableSummary: {
        ...emptyPayableSummary(),
        dueToday: { count: 2, amount: new Prisma.Decimal("300.00") },
        overdue: { count: 1, amount: new Prisma.Decimal("120.00") },
      },
      pendingConfirmation: { count: 1, sum: "450.00" },
    });

    const result = await getDashboardOverviewUseCase("org-1", deps);

    const codes = result.pendencies.map((p) => p.code);
    expect(codes).toContain("OVERDUE_PAYABLES");
    expect(codes).toContain("DUE_TODAY_PAYABLES");
    expect(codes).toContain("PENDING_TREASURY_CONFIRMATION");

    const overdue = result.pendencies.find(
      (p) => p.code === "OVERDUE_PAYABLES",
    );
    expect(overdue?.title).toBe("1 conta vencida");
    expect(overdue?.amount?.toFixed(2)).toBe("120.00");
  });

  it("timeline: mescla eventos do caixa e do cofre ordenados do mais recente pro mais antigo", async () => {
    const todayRegister = {
      id: "day-1",
      status: "OPEN",
      openingBalance: new Prisma.Decimal("0"),
      openedAt: new Date("2026-07-09T08:00:00.000Z"),
      openedByUserName: "Maria",
      reopenedAt: null,
      reopenedByUserName: null,
      closedAt: null,
      closingBalance: null,
      difference: null,
    };

    const safeMovementsToday = [
      {
        id: "sm-1",
        type: "ACCOUNTS_PAYABLE_PAYMENT",
        status: "CONFIRMED",
        amount: new Prisma.Decimal("420.00"),
        reason: 'Pagamento de "Energia Elétrica"',
        performedByUserName: "Ana",
        confirmedByUserName: null,
        cancelReason: null,
        createdAt: new Date("2026-07-09T14:20:00.000Z"),
      },
    ];

    const deps = buildDeps({ todayRegister, safeMovementsToday });

    const result = await getDashboardOverviewUseCase("org-1", deps);

    expect(result.timeline[0].id).toBe("safe-movement-sm-1");
    expect(result.timeline[0].amount?.toFixed(2)).toBe("-420.00");
    expect(result.timeline.some((e) => e.id === "register-open-day-1")).toBe(
      true,
    );
  });
});
