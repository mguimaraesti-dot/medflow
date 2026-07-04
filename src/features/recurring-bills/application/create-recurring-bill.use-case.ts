import type { RecurringBillRepository } from "../domain/recurring-bill.repository";
import type { RecurringBill } from "../domain/recurring-bill.entity";
import type { CreateRecurringBillInput } from "./dtos/create-recurring-bill.dto";

interface Deps {
  recurringBillRepository: RecurringBillRepository;
}

export async function createRecurringBillUseCase(
  input: CreateRecurringBillInput,
  organizationId: string,
  deps: Deps,
): Promise<RecurringBill> {
  return deps.recurringBillRepository.create({
    organizationId,
    supplierId: input.supplierId,
    categoryId: input.categoryId,
    description: input.description,
    amount: input.amount.toFixed(2),
    dueDay: input.dueDay,
  });
}
