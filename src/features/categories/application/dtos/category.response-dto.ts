import type { Category } from "../../domain/category.entity";
import type { CategoryLinkedRecordsCount } from "../../domain/category.repository";

export interface CategoryResponseDTO extends Category {
  /**
   * Total de registros vinculados (Contas a Pagar + Lançamentos de Fluxo
   * de Caixa + Recorrências) — exibido na coluna "Qtd. Contas" e usado
   * pra decidir se a exclusão é permitida, já que as 3 FKs são `ON DELETE
   * RESTRICT` no banco (qualquer uma delas > 0 bloqueia a exclusão).
   */
  linkedRecordsCount: number;
}

export function toCategoryResponseDTO(
  category: Category,
  counts?: CategoryLinkedRecordsCount,
): CategoryResponseDTO {
  const linkedRecordsCount =
    (counts?.accountsPayable ?? 0) +
    (counts?.cashFlowEntries ?? 0) +
    (counts?.recurringBills ?? 0);

  return { ...category, linkedRecordsCount };
}
