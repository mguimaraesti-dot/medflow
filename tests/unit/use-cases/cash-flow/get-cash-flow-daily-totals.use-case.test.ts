import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getCashFlowDailyTotalsUseCase } from "@/features/cash-flow/application/get-cash-flow-daily-totals.use-case";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";

describe("getCashFlowDailyTotalsUseCase", () => {
  it("agrega totais de entrada/saída por dia calendário", async () => {
    const dateFrom = new Date("2026-07-01T00:00:00.000Z");
    const dateTo = new Date("2026-07-02T23:59:59.999Z");

    const listByDateRange = vi.fn().mockResolvedValue([
      {
        type: "IN",
        amount: new Prisma.Decimal(100),
        occurredAt: new Date("2026-07-01T10:00:00.000Z"),
        categoryId: "cat-1",
      },
      {
        type: "OUT",
        amount: new Prisma.Decimal(30),
        occurredAt: new Date("2026-07-01T14:00:00.000Z"),
        categoryId: "cat-2",
      },
      {
        type: "IN",
        amount: new Prisma.Decimal(50),
        occurredAt: new Date("2026-07-02T09:00:00.000Z"),
        categoryId: "cat-1",
      },
    ]);
    const cashFlowEntryRepository = {
      listByDateRange,
    } as unknown as CashFlowEntryRepository;

    const result = await getCashFlowDailyTotalsUseCase(
      { dateFrom, dateTo },
      "org-1",
      { cashFlowEntryRepository },
    );

    expect(listByDateRange).toHaveBeenCalledWith("org-1", dateFrom, dateTo);
    expect(result).toEqual([
      {
        date: "2026-07-01",
        totalIn: new Prisma.Decimal(100),
        totalOut: new Prisma.Decimal(30),
        net: new Prisma.Decimal(70),
      },
      {
        date: "2026-07-02",
        totalIn: new Prisma.Decimal(50),
        totalOut: new Prisma.Decimal(0),
        net: new Prisma.Decimal(50),
      },
    ]);
  });
});
