import type { SupplierRepository } from "../domain/supplier.repository";
import type { Supplier } from "../domain/supplier.entity";
import type { CreateSupplierInput } from "./dtos/create-supplier.dto";

interface Deps {
  supplierRepository: SupplierRepository;
}

export async function createSupplierUseCase(
  input: CreateSupplierInput,
  organizationId: string,
  deps: Deps,
): Promise<Supplier> {
  return deps.supplierRepository.create({ organizationId, ...input });
}
