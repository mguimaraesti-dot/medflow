import type { CategoryRepository } from "../domain/category.repository";
import type { Category } from "../domain/category.entity";
import type { CreateCategoryInput } from "./dtos/create-category.dto";

interface Deps {
  categoryRepository: CategoryRepository;
}

export async function createCategoryUseCase(
  input: CreateCategoryInput,
  organizationId: string,
  deps: Deps,
): Promise<Category> {
  return deps.categoryRepository.create({ organizationId, ...input });
}
