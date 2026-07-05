import { describe, it, expect, vi } from "vitest";
import { createCategoryUseCase } from "@/features/categories/application/create-category.use-case";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";

describe("createCategoryUseCase", () => {
  it("cria a categoria vinculada à organização", async () => {
    const created = { id: "category-1", name: "Manutenção" };
    const create = vi.fn().mockResolvedValue(created);
    const categoryRepository = { create } as unknown as CategoryRepository;

    const result = await createCategoryUseCase(
      { name: "Manutenção", type: "OUT", color: "#7C3AED" },
      "org-1",
      { categoryRepository },
    );

    expect(create).toHaveBeenCalledWith({
      organizationId: "org-1",
      name: "Manutenção",
      type: "OUT",
      color: "#7C3AED",
    });
    expect(result).toBe(created);
  });
});
