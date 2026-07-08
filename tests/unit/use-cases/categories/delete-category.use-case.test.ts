import { describe, it, expect, vi } from "vitest";
import { deleteCategoryUseCase } from "@/features/categories/application/delete-category.use-case";
import {
  CategoryHasLinkedRecordsError,
  NotFoundError,
} from "@/core/errors/domain-error";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";

function buildCategory(overrides: Record<string, unknown> = {}) {
  return {
    id: "cat-1",
    organizationId: "org-1",
    name: "Energia",
    type: "OUT",
    color: "#F59E0B",
    icon: null,
    displayOrder: 1,
    active: true,
    ...overrides,
  };
}

describe("deleteCategoryUseCase", () => {
  it("bloqueia quando a categoria não existe ou é de outra organização", async () => {
    const categoryRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as CategoryRepository;

    await expect(
      deleteCategoryUseCase("cat-1", "org-1", { categoryRepository }),
    ).rejects.toThrow(NotFoundError);
  });

  it("lança CategoryHasLinkedRecordsError e nunca exclui quando existe Conta a Pagar vinculada", async () => {
    const category = buildCategory();
    const deleteFn = vi.fn();
    const categoryRepository = {
      findById: vi.fn().mockResolvedValue(category),
      countLinkedRecords: vi.fn().mockResolvedValue({
        accountsPayable: 3,
        cashFlowEntries: 0,
        recurringBills: 0,
      }),
      delete: deleteFn,
    } as unknown as CategoryRepository;

    await expect(
      deleteCategoryUseCase("cat-1", "org-1", { categoryRepository }),
    ).rejects.toThrow(CategoryHasLinkedRecordsError);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("lança CategoryHasLinkedRecordsError quando só existe Lançamento de Fluxo de Caixa vinculado", async () => {
    const category = buildCategory();
    const deleteFn = vi.fn();
    const categoryRepository = {
      findById: vi.fn().mockResolvedValue(category),
      countLinkedRecords: vi.fn().mockResolvedValue({
        accountsPayable: 0,
        cashFlowEntries: 18,
        recurringBills: 0,
      }),
      delete: deleteFn,
    } as unknown as CategoryRepository;

    await expect(
      deleteCategoryUseCase("cat-1", "org-1", { categoryRepository }),
    ).rejects.toThrow(CategoryHasLinkedRecordsError);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("lança CategoryHasLinkedRecordsError quando só existe Recorrência vinculada", async () => {
    const category = buildCategory();
    const deleteFn = vi.fn();
    const categoryRepository = {
      findById: vi.fn().mockResolvedValue(category),
      countLinkedRecords: vi.fn().mockResolvedValue({
        accountsPayable: 0,
        cashFlowEntries: 0,
        recurringBills: 1,
      }),
      delete: deleteFn,
    } as unknown as CategoryRepository;

    await expect(
      deleteCategoryUseCase("cat-1", "org-1", { categoryRepository }),
    ).rejects.toThrow(CategoryHasLinkedRecordsError);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("exclui quando não existe nenhum vínculo", async () => {
    const category = buildCategory();
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const categoryRepository = {
      findById: vi.fn().mockResolvedValue(category),
      countLinkedRecords: vi.fn().mockResolvedValue({
        accountsPayable: 0,
        cashFlowEntries: 0,
        recurringBills: 0,
      }),
      delete: deleteFn,
    } as unknown as CategoryRepository;

    await deleteCategoryUseCase("cat-1", "org-1", { categoryRepository });

    expect(deleteFn).toHaveBeenCalledWith("cat-1");
  });
});
