import {
  NotFoundError,
  SupplierHasLinkedRecordsError,
} from "@/core/errors/domain-error";
import type { SupplierRepository } from "../domain/supplier.repository";

interface Deps {
  supplierRepository: SupplierRepository;
}

/**
 * Só exclui quando não existe nenhuma Conta a Pagar nem Recorrência
 * vinculada — as duas FKs são `ON DELETE RESTRICT` no banco, então essa
 * checagem evita um erro de constraint cru chegando ao usuário; o banco
 * continua sendo a garantia final contra perda de histórico.
 */
export async function deleteSupplierUseCase(
  id: string,
  organizationId: string,
  deps: Deps,
): Promise<void> {
  const supplier = await deps.supplierRepository.findById(id);
  if (!supplier || supplier.organizationId !== organizationId) {
    throw new NotFoundError("Beneficiário", id);
  }

  const linked = await deps.supplierRepository.countLinkedRecords(id);
  if (linked.accountsPayable > 0 || linked.recurringBills > 0) {
    throw new SupplierHasLinkedRecordsError(id);
  }

  await deps.supplierRepository.delete(id);
}
