import type { Category, CategoryType } from "./category.entity";

export interface CreateCategoryInput {
  organizationId: string;
  name: string;
  type: CategoryType;
  color: string;
}

export interface CategoryRepository {
  /** Lista categorias ativas da organização, ordenadas por displayOrder. */
  listActive(organizationId: string, type?: CategoryType): Promise<Category[]>;

  /** `displayOrder` é atribuído automaticamente (último da lista + 1) — cadastro rápido, não expõe o campo. */
  create(data: CreateCategoryInput): Promise<Category>;
}
