import { NotFoundError } from "@/core/errors/domain-error";
import type { RecurringBillRepository } from "../domain/recurring-bill.repository";
import type { RecurringBill } from "../domain/recurring-bill.entity";

interface Deps {
  recurringBillRepository: RecurringBillRepository;
}

export async function getRecurringBillUseCase(
  id: string,
  organizationId: string,
  deps: Deps,
): Promise<RecurringBill> {
  const bill = await deps.recurringBillRepository.findById(id);
  if (!bill || bill.organizationId !== organizationId) {
    throw new NotFoundError("Recorrência", id);
  }
  return bill;
}
