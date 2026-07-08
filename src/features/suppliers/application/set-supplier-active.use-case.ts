import { NotFoundError } from "@/core/errors/domain-error";
import type { SupplierRepository } from "../domain/supplier.repository";
import type { Supplier } from "../domain/supplier.entity";

interface Deps {
  supplierRepository: SupplierRepository;
}

/** Inativar/reativar nunca afeta histórico — só um flag de exibição/uso em cadastros novos, sem checagem de vínculo (diferente de `deleteSupplierUseCase`). */
export async function setSupplierActiveUseCase(
  id: string,
  active: boolean,
  organizationId: string,
  deps: Deps,
): Promise<Supplier> {
  const supplier = await deps.supplierRepository.findById(id);
  if (!supplier || supplier.organizationId !== organizationId) {
    throw new NotFoundError("Beneficiário", id);
  }

  return deps.supplierRepository.setActive(id, active);
}
