import type { CategoryRepository } from "../domain/category.repository";
import type { Category } from "../domain/category.entity";
import type { ListCategoriesInput } from "./dtos/list-categories.dto";

interface Deps {
  categoryRepository: CategoryRepository;
}

export async function listCategoriesUseCase(
  input: ListCategoriesInput,
  organizationId: string,
  deps: Deps,
): Promise<Category[]> {
  return deps.categoryRepository.listActive(organizationId, input.type);
}
