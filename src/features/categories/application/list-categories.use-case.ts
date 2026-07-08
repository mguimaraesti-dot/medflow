import type { CategoryRepository } from "../domain/category.repository";
import type { ListCategoriesInput } from "./dtos/list-categories.dto";
import {
  toCategoryResponseDTO,
  type CategoryResponseDTO,
} from "./dtos/category.response-dto";

interface Deps {
  categoryRepository: CategoryRepository;
}

/**
 * Contagem de vínculos calculada em lote (uma única query por tabela,
 * não N+1) e mesclada por categoria — mesmo padrão de `listSuppliersUseCase`.
 */
export async function listCategoriesUseCase(
  input: ListCategoriesInput,
  organizationId: string,
  deps: Deps,
): Promise<CategoryResponseDTO[]> {
  const [categories, linkedCounts] = await Promise.all([
    deps.categoryRepository.listActive(organizationId, input.type),
    deps.categoryRepository.countLinkedRecordsByOrganization(organizationId),
  ]);

  return categories.map((category) =>
    toCategoryResponseDTO(category, linkedCounts.get(category.id)),
  );
}
