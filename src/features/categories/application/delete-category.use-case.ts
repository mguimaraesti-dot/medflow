import {
  CategoryHasLinkedRecordsError,
  NotFoundError,
} from "@/core/errors/domain-error";
import type { CategoryRepository } from "../domain/category.repository";

interface Deps {
  categoryRepository: CategoryRepository;
}

/**
 * Só exclui quando não existe nenhuma Conta a Pagar, Lançamento de Fluxo
 * de Caixa nem Recorrência vinculados — as 3 FKs são `ON DELETE RESTRICT`
 * no banco, então essa checagem evita um erro de constraint cru
 * chegando ao usuário; o banco continua sendo a garantia final contra
 * perda de histórico.
 */
export async function deleteCategoryUseCase(
  id: string,
  organizationId: string,
  deps: Deps,
): Promise<void> {
  const category = await deps.categoryRepository.findById(id);
  if (!category || category.organizationId !== organizationId) {
    throw new NotFoundError("Categoria", id);
  }

  const linked = await deps.categoryRepository.countLinkedRecords(id);
  const linkedRecordsCount =
    linked.accountsPayable + linked.cashFlowEntries + linked.recurringBills;

  if (linkedRecordsCount > 0) {
    throw new CategoryHasLinkedRecordsError(id, linkedRecordsCount);
  }

  await deps.categoryRepository.delete(id);
}
