import type { RecurringBillRepository } from "../domain/recurring-bill.repository";
import type { RecurringBill } from "../domain/recurring-bill.entity";

interface Deps {
  recurringBillRepository: RecurringBillRepository;
}

export async function deactivateRecurringBillUseCase(
  recurringBillId: string,
  deps: Deps,
): Promise<RecurringBill> {
  return deps.recurringBillRepository.deactivate(recurringBillId);
}
