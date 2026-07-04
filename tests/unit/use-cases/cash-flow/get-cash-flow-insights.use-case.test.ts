import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getCashFlowInsightsUseCase } from "@/features/cash-flow/application/get-cash-flow-insights.use-case";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";

describe("getCashFlowInsightsUseCase", () => {
  it("sem caixa hoje: byCategory vazio e byHour com 24 posições zeradas", async () => {
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;
    const cashFlowEntryRepository = {} as CashFlowEntryRepository;
    const categoryRepository = {} as CategoryRepository;

    const result = await getCashFlowInsightsUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      categoryRepository,
    });

    expect(result.byCategory).toEqual([]);
    expect(result.byHour).toHaveLength(24);
    expect(
      result.byHour.every((hour) => hour.total.toFixed(2) === "0.00"),
    ).toBe(true);
  });

  it("agrupa por categoria, somando múltiplos lançamentos da mesma categoria", async () => {
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue({ id: "day-1" }),
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      listByCashRegisterDay: vi.fn().mockResolvedValue([
        {
          type: "IN",
          amount: new Prisma.Decimal("100"),
          occurredAt: new Date("2026-07-15T10:00:00.000Z"),
          categoryId: "cat-1",
        },
        {
          type: "IN",
          amount: new Prisma.Decimal("50"),
          occurredAt: new Date("2026-07-15T11:00:00.000Z"),
          categoryId: "cat-1",
        },
        {
          type: "IN",
          amount: new Prisma.Decimal("30"),
          occurredAt: new Date("2026-07-15T12:00:00.000Z"),
          categoryId: "cat-2",
        },
      ]),
    } as unknown as CashFlowEntryRepository;

    const categoryRepository = {
      listActive: vi.fn().mockResolvedValue([
        { id: "cat-1", name: "Consulta", color: "#16A34A" },
        { id: "cat-2", name: "PIX", color: "#22C55E" },
      ]),
    } as unknown as CategoryRepository;

    const result = await getCashFlowInsightsUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      categoryRepository,
    });

    const cat1 = result.byCategory.find((c) => c.categoryId === "cat-1");
    expect(cat1?.total.toFixed(2)).toBe("150.00");
    expect(cat1?.categoryName).toBe("Consulta");
  });

  it("byHour tem sempre 24 posições e soma por hora corretamente", async () => {
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue({ id: "day-1" }),
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      listByCashRegisterDay: vi.fn().mockResolvedValue([
        {
          type: "IN",
          amount: new Prisma.Decimal("100"),
          occurredAt: new Date("2026-07-15T09:30:00.000Z"),
          categoryId: "cat-1",
        },
        {
          type: "IN",
          amount: new Prisma.Decimal("20"),
          occurredAt: new Date("2026-07-15T09:45:00.000Z"),
          categoryId: "cat-1",
        },
      ]),
    } as unknown as CashFlowEntryRepository;

    const categoryRepository = {
      listActive: vi.fn().mockResolvedValue([]),
    } as unknown as CategoryRepository;

    const result = await getCashFlowInsightsUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      categoryRepository,
    });

    expect(result.byHour).toHaveLength(24);
    expect(result.byHour[9].total.toFixed(2)).toBe("120.00");
    expect(result.byHour[10].total.toFixed(2)).toBe("0.00");
  });

  it("ignora lançamentos type OUT — insights são só sobre receita", async () => {
    const cashRegisterDayRepository = {
      findByOrganizationAndDate: vi.fn().mockResolvedValue({ id: "day-1" }),
    } as unknown as CashRegisterDayRepository;

    const cashFlowEntryRepository = {
      listByCashRegisterDay: vi.fn().mockResolvedValue([
        {
          type: "OUT",
          amount: new Prisma.Decimal("999"),
          occurredAt: new Date("2026-07-15T14:00:00.000Z"),
          categoryId: "cat-3",
        },
      ]),
    } as unknown as CashFlowEntryRepository;

    const categoryRepository = {
      listActive: vi
        .fn()
        .mockResolvedValue([
          { id: "cat-3", name: "Aluguel", color: "#DC2626" },
        ]),
    } as unknown as CategoryRepository;

    const result = await getCashFlowInsightsUseCase("org-1", {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      categoryRepository,
    });

    expect(result.byCategory).toEqual([]);
    expect(result.byHour[14].total.toFixed(2)).toBe("0.00");
  });
});
