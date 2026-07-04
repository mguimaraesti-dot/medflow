import { toMoneyString } from "@/shared/lib/money";
import type { RecurringBill } from "../../domain/recurring-bill.entity";

export interface RecurringBillResponseDTO {
  id: string;
  organizationId: string;
  supplierId: string;
  categoryId: string;
  description: string;
  amount: string;
  dueDay: number;
  active: boolean;
}

export function toRecurringBillResponseDTO(
  bill: RecurringBill,
): RecurringBillResponseDTO {
  return {
    id: bill.id,
    organizationId: bill.organizationId,
    supplierId: bill.supplierId,
    categoryId: bill.categoryId,
    description: bill.description,
    amount: toMoneyString(bill.amount) as string,
    dueDay: bill.dueDay,
    active: bill.active,
  };
}
