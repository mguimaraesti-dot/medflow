import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getAccountsPayableByCategoryUseCase } from "@/features/accounts-payable/application/get-accounts-payable-by-category.use-case";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";

describe("getAccountsPayableByCategoryUseCase", () => {
  it("agrega contas pagas por categoria dentro do período de paidAt", async () => {
    const dateFrom = new Date("2026-07-01T00:00:00.000Z");
    const dateTo = new Date("2026-07-31T23:59:59.999Z");

    const list = vi.fn().mockResolvedValue({
      items: [
        { categoryId: "cat-1", amount: new Prisma.Decimal(100) },
        { categoryId: "cat-1", amount: new Prisma.Decimal(50) },
        { categoryId: "cat-2", amount: new Prisma.Decimal(500) },
      ],
      page: 1,
      pageSize: 10000,
      total: 3,
      totalPages: 1,
    });
    const accountsPayableRepository = {
      list,
    } as unknown as AccountsPayableRepository;

    const listActive = vi.fn().mockResolvedValue([
      { id: "cat-1", name: "Aluguel", color: "#DC2626" },
      { id: "cat-2", name: "Software", color: "#2563EB" },
    ]);
    const categoryRepository = {
      listActive,
    } as unknown as CategoryRepository;

    const result = await getAccountsPayableByCategoryUseCase(
      { dateFrom, dateTo },
      "org-1",
      { accountsPayableRepository, categoryRepository },
    );

    expect(list).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        status: "PAID",
        paidAtFrom: dateFrom,
        paidAtTo: dateTo,
      },
      { page: 1, pageSize: 10000 },
    );
    expect(result).toEqual([
      {
        categoryId: "cat-1",
        categoryName: "Aluguel",
        color: "#DC2626",
        total: new Prisma.Decimal(150),
      },
      {
        categoryId: "cat-2",
        categoryName: "Software",
        color: "#2563EB",
        total: new Prisma.Decimal(500),
      },
    ]);
  });
});
