import type { Category, CategoryType } from "./category.entity";

export interface CategoryRepository {
  /** Lista categorias ativas da organização, ordenadas por displayOrder. */
  listActive(organizationId: string, type?: CategoryType): Promise<Category[]>;
}
