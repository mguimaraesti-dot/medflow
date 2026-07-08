import { describe, it, expect, vi } from "vitest";
import { updateCategoryUseCase } from "@/features/categories/application/update-category.use-case";
import { NotFoundError } from "@/core/errors/domain-error";
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

const input = {
  name: "Energia Elétrica",
  type: "OUT" as const,
  color: "#DC2626",
};

describe("updateCategoryUseCase", () => {
  it("bloqueia quando a categoria não existe ou é de outra organização", async () => {
    const categoryRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as CategoryRepository;

    await expect(
      updateCategoryUseCase("cat-1", input, "org-1", { categoryRepository }),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia quando a categoria pertence a outra organização", async () => {
    const category = buildCategory({ organizationId: "org-2" });
    const categoryRepository = {
      findById: vi.fn().mockResolvedValue(category),
    } as unknown as CategoryRepository;

    await expect(
      updateCategoryUseCase("cat-1", input, "org-1", { categoryRepository }),
    ).rejects.toThrow(NotFoundError);
  });

  it("atualiza nome, tipo e cor", async () => {
    const category = buildCategory();
    const update = vi.fn().mockResolvedValue({ ...category, ...input });
    const categoryRepository = {
      findById: vi.fn().mockResolvedValue(category),
      update,
    } as unknown as CategoryRepository;

    const result = await updateCategoryUseCase("cat-1", input, "org-1", {
      categoryRepository,
    });

    expect(update).toHaveBeenCalledWith("cat-1", input);
    expect(result.name).toBe("Energia Elétrica");
    expect(result.color).toBe("#DC2626");
  });
});
