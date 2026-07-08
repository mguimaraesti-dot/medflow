import type { SupplierRepository } from "../domain/supplier.repository";
import {
  toSupplierResponseDTO,
  type SupplierResponseDTO,
} from "./dtos/supplier.response-dto";

interface Deps {
  supplierRepository: SupplierRepository;
}

/**
 * Retorna ativos e inativos — telas que precisam só de ativos (ex:
 * `SupplierCombobox` ao criar conta nova) filtram por `active` na
 * apresentação. Contagem de vínculos é calculada em lote (uma única
 * query por tabela, não N+1) e mesclada por `supplierId`.
 */
export async function listSuppliersUseCase(
  organizationId: string,
  deps: Deps,
): Promise<SupplierResponseDTO[]> {
  const [suppliers, linkedCounts] = await Promise.all([
    deps.supplierRepository.list(organizationId),
    deps.supplierRepository.countLinkedRecordsByOrganization(organizationId),
  ]);

  return suppliers.map((supplier) =>
    toSupplierResponseDTO(supplier, linkedCounts.get(supplier.id)),
  );
}
