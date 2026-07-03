import { describe, it, expect, vi } from "vitest";
import { listCategoriesUseCase } from "@/features/categories/application/list-categories.use-case";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { Category } from "@/features/categories/domain/category.entity";

describe("listCategoriesUseCase", () => {
  it("delega ao repositório com organizationId e type do input", async () => {
    const categories: Category[] = [
      {
        id: "cat-1",
        organizationId: "org-1",
        name: "Consulta Particular",
        type: "IN",
        color: "#16A34A",
        icon: "stethoscope",
        displayOrder: 1,
        active: true,
      },
    ];
    const listActive = vi.fn().mockResolvedValue(categories);
    const categoryRepository = { listActive } as unknown as CategoryRepository;

    const result = await listCategoriesUseCase({ type: "IN" }, "org-1", {
      categoryRepository,
    });

    expect(listActive).toHaveBeenCalledWith("org-1", "IN");
    expect(result).toBe(categories);
  });

  it("permite listar sem filtro de tipo", async () => {
    const listActive = vi.fn().mockResolvedValue([]);
    const categoryRepository = { listActive } as unknown as CategoryRepository;

    await listCategoriesUseCase({}, "org-1", { categoryRepository });

    expect(listActive).toHaveBeenCalledWith("org-1", undefined);
  });
});
