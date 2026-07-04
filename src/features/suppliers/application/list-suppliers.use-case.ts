import type { SupplierRepository } from "../domain/supplier.repository";
import type { Supplier } from "../domain/supplier.entity";

interface Deps {
  supplierRepository: SupplierRepository;
}

export async function listSuppliersUseCase(
  organizationId: string,
  deps: Deps,
): Promise<Supplier[]> {
  return deps.supplierRepository.listActive(organizationId);
}
