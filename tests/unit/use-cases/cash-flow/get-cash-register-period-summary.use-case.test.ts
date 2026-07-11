import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getCashRegisterPeriodSummaryUseCase } from "@/features/cash-flow/application/get-cash-register-period-summary.use-case";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";

function buildRepository(
  entries: Array<{ type: "IN" | "OUT"; amount: number; isCash: boolean }>,
) {
  const listByDateRange = vi.fn().mockResolvedValue(
    entries.map((entry) => ({
      type: entry.type,
      amount: new Prisma.Decimal(entry.amount),
      occurredAt: new Date("2026-07-05T12:00:00.000Z"),
      categoryId: "cat-1",
      isCash: entry.isCash,
    })),
  );
  return {
    cashFlowEntryRepository: {
      listByDateRange,
    } as unknown as CashFlowEntryRepository,
    listByDateRange,
  };
}

describe("getCashRegisterPeriodSummaryUseCase", () => {
  const dateFrom = new Date("2026-07-01T00:00:00.000Z");
  const dateTo = new Date("2026-07-31T23:59:59.999Z");

  it("separa entradas em Dinheiro x PIX e soma saídas", async () => {
    const { cashFlowEntryRepository, listByDateRange } = buildRepository([
      { type: "IN", amount: 100, isCash: true },
      { type: "IN", amount: 50, isCash: true },
      { type: "IN", amount: 200, isCash: false },
      { type: "OUT", amount: 30, isCash: true },
    ]);

    const result = await getCashRegisterPeriodSummaryUseCase(
      "org-1",
      dateFrom,
      dateTo,
      { cashFlowEntryRepository },
    );

    expect(listByDateRange).toHaveBeenCalledWith("org-1", dateFrom, dateTo);
    expect(result).toEqual({
      cashIn: "150.00",
      pixIn: "200.00",
      totalIn: "350.00",
      totalOut: "30.00",
    });
  });

  it("retorna zeros quando não há lançamentos no período", async () => {
    const { cashFlowEntryRepository } = buildRepository([]);

    const result = await getCashRegisterPeriodSummaryUseCase(
      "org-1",
      dateFrom,
      dateTo,
      { cashFlowEntryRepository },
    );

    expect(result).toEqual({
      cashIn: "0.00",
      pixIn: "0.00",
      totalIn: "0.00",
      totalOut: "0.00",
    });
  });

  it("soma saídas mesmo que não sejam isCash (não assume a restrição da UI)", async () => {
    const { cashFlowEntryRepository } = buildRepository([
      { type: "OUT", amount: 40, isCash: false },
    ]);

    const result = await getCashRegisterPeriodSummaryUseCase(
      "org-1",
      dateFrom,
      dateTo,
      { cashFlowEntryRepository },
    );

    expect(result.totalOut).toBe("40.00");
  });
});
