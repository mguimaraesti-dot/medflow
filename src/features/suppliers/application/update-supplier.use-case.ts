import { NotFoundError } from "@/core/errors/domain-error";
import type { SupplierRepository } from "../domain/supplier.repository";
import type { Supplier } from "../domain/supplier.entity";
import type { UpdateSupplierInput } from "./dtos/update-supplier.dto";

interface Deps {
  supplierRepository: SupplierRepository;
}

/** Nunca altera `active` — inativar/reativar é sempre via `setSupplierActiveUseCase`. */
export async function updateSupplierUseCase(
  id: string,
  input: UpdateSupplierInput,
  organizationId: string,
  deps: Deps,
): Promise<Supplier> {
  const supplier = await deps.supplierRepository.findById(id);
  if (!supplier || supplier.organizationId !== organizationId) {
    throw new NotFoundError("Beneficiário", id);
  }

  return deps.supplierRepository.update(id, input);
}
