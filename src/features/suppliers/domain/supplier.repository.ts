import type { Supplier, SupplierPersonType } from "./supplier.entity";

export interface CreateSupplierInput {
  organizationId: string;
  name: string;
  personType?: SupplierPersonType;
  document?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

/** Nunca inclui `active` — inativar/reativar é sempre via `setActive`, nunca junto de uma edição normal. */
export interface UpdateSupplierInput {
  name: string;
  personType: SupplierPersonType;
  document?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

/** Contagem de vínculos usada só pra decidir se `delete()` pode prosseguir — ambas FKs são `ON DELETE RESTRICT` no banco (nunca perde histórico por cascata). */
export interface SupplierLinkedRecordsCount {
  accountsPayable: number;
  recurringBills: number;
}

export interface SupplierRepository {
  /**
   * Todos os beneficiários (ativos e inativos) — nunca filtra por `active`
   * aqui, pois outras telas (ex: Contas a Pagar) usam esta lista pra
   * resolver o nome de beneficiários já vinculados a registros antigos,
   * mesmo que hoje estejam inativos. Quem precisa esconder inativos (ex:
   * `SupplierCombobox` ao criar uma conta nova) filtra no próprio
   * componente por `supplier.active`.
   */
  list(organizationId: string): Promise<Supplier[]>;
  findById(id: string): Promise<Supplier | null>;
  create(data: CreateSupplierInput): Promise<Supplier>;
  update(id: string, data: UpdateSupplierInput): Promise<Supplier>;
  setActive(id: string, active: boolean): Promise<Supplier>;
  /** Só chamado depois que o use case confirma `countLinkedRecords` zerado. */
  delete(id: string): Promise<void>;
  countLinkedRecords(id: string): Promise<SupplierLinkedRecordsCount>;
  /** Mesma contagem de `countLinkedRecords`, mas em lote pra toda a organização de uma vez (evita N+1 na listagem) — chave é o `supplierId`. */
  countLinkedRecordsByOrganization(
    organizationId: string,
  ): Promise<Map<string, SupplierLinkedRecordsCount>>;
}
