import type { Category, CategoryType } from "./category.entity";

export interface CreateCategoryInput {
  organizationId: string;
  name: string;
  type: CategoryType;
  color: string;
}

/** Campos editáveis via `update()` — `displayOrder`/`active`/`icon` não mudam por aqui. */
export interface UpdateCategoryInput {
  name: string;
  type: CategoryType;
  color: string;
}

/** Quantidade de registros que impedem a exclusão (todas as FKs são RESTRICT). */
export interface CategoryLinkedRecordsCount {
  accountsPayable: number;
  cashFlowEntries: number;
  recurringBills: number;
}

export interface CategoryRepository {
  /** Lista categorias ativas da organização, ordenadas por displayOrder. */
  listActive(organizationId: string, type?: CategoryType): Promise<Category[]>;

  findById(id: string): Promise<Category | null>;

  /** `displayOrder` é atribuído automaticamente (último da lista + 1) — cadastro rápido, não expõe o campo. */
  create(data: CreateCategoryInput): Promise<Category>;

  update(id: string, data: UpdateCategoryInput): Promise<Category>;

  /** Só chamado depois de confirmar (use case) que não há nenhum registro vinculado. */
  delete(id: string): Promise<void>;

  /** Contagem usada só pra decidir se `delete()` pode prosseguir — as 3 FKs são `ON DELETE RESTRICT` (nunca perde histórico por cascata). */
  countLinkedRecords(id: string): Promise<CategoryLinkedRecordsCount>;

  /**
   * Mesma contagem de `countLinkedRecords`, mas em lote (3 `groupBy`, não
   * N+1) pra toda a organização de uma vez — usada pra exibir "Qtd.
   * Contas" na listagem sem uma query por categoria.
   */
  countLinkedRecordsByOrganization(
    organizationId: string,
  ): Promise<Map<string, CategoryLinkedRecordsCount>>;
}
