import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getExpensesByCategoryUseCase } from "@/features/cash-flow/application/get-expenses-by-category.use-case";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";

describe("getExpensesByCategoryUseCase", () => {
  it("agrega só lançamentos type OUT por categoria", async () => {
    const dateFrom = new Date("2026-07-01T00:00:00.000Z");
    const dateTo = new Date("2026-07-31T23:59:59.999Z");

    const listByDateRange = vi.fn().mockResolvedValue([
      {
        type: "OUT",
        amount: new Prisma.Decimal(100),
        occurredAt: dateFrom,
        categoryId: "cat-1",
      },
      {
        type: "OUT",
        amount: new Prisma.Decimal(50),
        occurredAt: dateFrom,
        categoryId: "cat-1",
      },
      {
        type: "IN",
        amount: new Prisma.Decimal(500),
        occurredAt: dateFrom,
        categoryId: "cat-2",
      },
    ]);
    const cashFlowEntryRepository = {
      listByDateRange,
    } as unknown as CashFlowEntryRepository;

    const listActive = vi.fn().mockResolvedValue([
      { id: "cat-1", name: "Aluguel", color: "#DC2626" },
      { id: "cat-2", name: "Consultas", color: "#16A34A" },
    ]);
    const categoryRepository = {
      listActive,
    } as unknown as CategoryRepository;

    const result = await getExpensesByCategoryUseCase(
      { dateFrom, dateTo },
      "org-1",
      { cashFlowEntryRepository, categoryRepository },
    );

    expect(listByDateRange).toHaveBeenCalledWith("org-1", dateFrom, dateTo);
    expect(result).toEqual([
      {
        categoryId: "cat-1",
        categoryName: "Aluguel",
        color: "#DC2626",
        total: new Prisma.Decimal(150),
      },
    ]);
  });
});
