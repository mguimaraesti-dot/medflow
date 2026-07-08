import type { Supplier } from "../../domain/supplier.entity";
import type { SupplierLinkedRecordsCount } from "../../domain/supplier.repository";

export interface SupplierResponseDTO extends Supplier {
  /** Nº de Contas a Pagar vinculadas — exibido na coluna "Contas Vinculadas". */
  accountsPayableCount: number;
  /**
   * Beneficiários só com Recorrência (sem nenhuma Conta a Pagar avulsa
   * ainda) também não podem ser excluídos — mesma FK `ON DELETE RESTRICT`
   * do banco. Não tem coluna própria na tabela, só bloqueia o botão Excluir.
   */
  hasLinkedRecurringBills: boolean;
}

export function toSupplierResponseDTO(
  supplier: Supplier,
  counts?: SupplierLinkedRecordsCount,
): SupplierResponseDTO {
  return {
    ...supplier,
    accountsPayableCount: counts?.accountsPayable ?? 0,
    hasLinkedRecurringBills: (counts?.recurringBills ?? 0) > 0,
  };
}
