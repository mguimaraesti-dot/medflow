export type CategoryType = "IN" | "OUT";

/**
 * Entidade de domínio de Category. Sem campos monetários — pode ir
 * direto para o frontend sem passar por um DTO de saída.
 */
export interface Category {
  id: string;
  organizationId: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string | null;
  displayOrder: number;
  active: boolean;
}
