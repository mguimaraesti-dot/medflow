import { describe, it, expect, vi } from "vitest";
import { listCategoriesUseCase } from "@/features/categories/application/list-categories.use-case";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { Category } from "@/features/categories/domain/category.entity";

function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    organizationId: "org-1",
    name: "Consulta Particular",
    type: "IN",
    color: "#16A34A",
    icon: "stethoscope",
    displayOrder: 1,
    active: true,
    ...overrides,
  };
}

describe("listCategoriesUseCase", () => {
  it("delega ao repositório com organizationId e type do input", async () => {
    const categories = [buildCategory()];
    const listActive = vi.fn().mockResolvedValue(categories);
    const countLinkedRecordsByOrganization = vi
      .fn()
      .mockResolvedValue(new Map());
    const categoryRepository = {
      listActive,
      countLinkedRecordsByOrganization,
    } as unknown as CategoryRepository;

    const result = await listCategoriesUseCase({ type: "IN" }, "org-1", {
      categoryRepository,
    });

    expect(listActive).toHaveBeenCalledWith("org-1", "IN");
    expect(countLinkedRecordsByOrganization).toHaveBeenCalledWith("org-1");
    expect(result).toEqual([{ ...categories[0], linkedRecordsCount: 0 }]);
  });

  it("permite listar sem filtro de tipo", async () => {
    const listActive = vi.fn().mockResolvedValue([]);
    const countLinkedRecordsByOrganization = vi
      .fn()
      .mockResolvedValue(new Map());
    const categoryRepository = {
      listActive,
      countLinkedRecordsByOrganization,
    } as unknown as CategoryRepository;

    await listCategoriesUseCase({}, "org-1", { categoryRepository });

    expect(listActive).toHaveBeenCalledWith("org-1", undefined);
  });

  it("soma contas a pagar + lançamentos de fluxo de caixa + recorrências no linkedRecordsCount", async () => {
    const categories = [buildCategory()];
    const listActive = vi.fn().mockResolvedValue(categories);
    const countLinkedRecordsByOrganization = vi
      .fn()
      .mockResolvedValue(
        new Map([
          [
            "cat-1",
            { accountsPayable: 3, cashFlowEntries: 10, recurringBills: 2 },
          ],
        ]),
      );
    const categoryRepository = {
      listActive,
      countLinkedRecordsByOrganization,
    } as unknown as CategoryRepository;

    const [result] = await listCategoriesUseCase({}, "org-1", {
      categoryRepository,
    });

    expect(result.linkedRecordsCount).toBe(15);
  });
});
