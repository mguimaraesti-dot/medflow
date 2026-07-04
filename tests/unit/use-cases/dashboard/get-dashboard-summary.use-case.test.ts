import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getDashboardSummaryUseCase } from "@/features/dashboard/application/get-dashboard-summary.use-case";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { PaginatedResult } from "@/shared/lib/pagination";
import type { CashFlowEntry } from "@/features/cash-flow/domain/cash-flow-entry.entity";

const emptyRecent: PaginatedResult<CashFlowEntry> = {
  items: [],
  page: 1,
  pageSize: 5,
  total: 0,
  totalPages: 1,
};

describe("getDashboardSummaryUseCase", () => {
  it("caixa de hoje OPEN: saldo = abertura + entradas ao vivo - saídas ao vivo", async () => {
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue({
        id: "day-1",
        status: "OPEN",
        openingBalance: "100.00",
      }),
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "200.00", totalOut: "50.00" }),
      listByDateRange: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue(emptyRecent),
    } as unknown as CashFlowEntryRepository;

    const result = await getDashboardSummaryUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
    });

    expect(result.cashRegisterStatus).toBe("OPEN");
    expect(result.currentBalance.toFixed(2)).toBe("250.00");
    expect(result.revenueToday.toFixed(2)).toBe("200.00");
    expect(result.expensesToday.toFixed(2)).toBe("50.00");
    expect(result.resultToday.toFixed(2)).toBe("150.00");
  });

  it("caixa de hoje CLOSED: saldo = closingBalance do dia", async () => {
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue({
        id: "day-1",
        status: "CLOSED",
        openingBalance: "100.00",
        closingBalance: "300.00",
      }),
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      sumByCashRegisterDay: vi
        .fn()
        .mockResolvedValue({ totalIn: "250.00", totalOut: "50.00" }),
      listByDateRange: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue(emptyRecent),
    } as unknown as CashFlowEntryRepository;

    const result = await getDashboardSummaryUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
    });

    expect(result.cashRegisterStatus).toBe("CLOSED");
    expect(result.currentBalance.toFixed(2)).toBe("300.00");
    expect(result.resultToday.toFixed(2)).toBe("200.00");
  });

  it("sem registro hoje, mas existe último fechamento: saldo = closingBalance do último fechado", async () => {
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue(null),
      findLastClosed: vi.fn().mockResolvedValue({ closingBalance: "500.00" }),
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      listByDateRange: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue(emptyRecent),
    } as unknown as CashFlowEntryRepository;

    const result = await getDashboardSummaryUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
    });

    expect(result.cashRegisterStatus).toBe("NOT_OPENED");
    expect(result.currentBalance.toFixed(2)).toBe("500.00");
    expect(result.revenueToday.toFixed(2)).toBe("0.00");
  });

  it("primeiro uso do sistema (nenhum registro hoje nem fechamento anterior): saldo zero", async () => {
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue(null),
      findLastClosed: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      listByDateRange: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue(emptyRecent),
    } as unknown as CashFlowEntryRepository;

    const result = await getDashboardSummaryUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
    });

    expect(result.cashRegisterStatus).toBe("NOT_OPENED");
    expect(result.currentBalance.toFixed(2)).toBe("0.00");
  });

  it("resultMonth soma só lançamentos do mês corrente, ignorando meses anteriores", async () => {
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue(null),
      findLastClosed: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      listByDateRange: vi.fn().mockResolvedValue([
        {
          type: "IN",
          amount: new Prisma.Decimal("100"),
          occurredAt: new Date("2026-06-20T10:00:00.000Z"),
        },
        {
          type: "IN",
          amount: new Prisma.Decimal("300"),
          occurredAt: new Date("2026-07-05T10:00:00.000Z"),
        },
        {
          type: "OUT",
          amount: new Prisma.Decimal("50"),
          occurredAt: new Date("2026-07-10T10:00:00.000Z"),
        },
      ]),
      list: vi.fn().mockResolvedValue(emptyRecent),
    } as unknown as CashFlowEntryRepository;

    const result = await getDashboardSummaryUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      referenceDate: new Date("2026-07-15T12:00:00.000Z"),
    });

    expect(result.resultMonth.toFixed(2)).toBe("250.00");
  });

  it("dailySeries sempre tem 30 entradas, preenchendo dias sem lançamento com zero", async () => {
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue(null),
      findLastClosed: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      listByDateRange: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue(emptyRecent),
    } as unknown as CashFlowEntryRepository;

    const result = await getDashboardSummaryUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      referenceDate: new Date("2026-07-15T12:00:00.000Z"),
    });

    expect(result.dailySeries).toHaveLength(30);
    expect(
      result.dailySeries.every((day) => day.totalIn.toFixed(2) === "0.00"),
    ).toBe(true);
    expect(result.dailySeries[29].date.toISOString().slice(0, 10)).toBe(
      "2026-07-15",
    );
    expect(result.dailySeries[0].date.toISOString().slice(0, 10)).toBe(
      "2026-06-16",
    );
  });
});
