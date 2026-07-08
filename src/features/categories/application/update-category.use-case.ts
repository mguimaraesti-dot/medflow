import { NotFoundError } from "@/core/errors/domain-error";
import type { CategoryRepository } from "../domain/category.repository";
import type { Category } from "../domain/category.entity";
import type { UpdateCategoryInput } from "./dtos/update-category.dto";

interface Deps {
  categoryRepository: CategoryRepository;
}

export async function updateCategoryUseCase(
  id: string,
  input: UpdateCategoryInput,
  organizationId: string,
  deps: Deps,
): Promise<Category> {
  const category = await deps.categoryRepository.findById(id);
  if (!category || category.organizationId !== organizationId) {
    throw new NotFoundError("Categoria", id);
  }

  return deps.categoryRepository.update(id, input);
}
