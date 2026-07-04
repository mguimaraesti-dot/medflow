import type { RecurringBill } from "./recurring-bill.entity";

export interface CreateRecurringBillInput {
  organizationId: string;
  supplierId: string;
  categoryId: string;
  description: string;
  amount: string; // convertido para Decimal só na infraestrutura
  dueDay: number;
}

export interface RecurringBillRepository {
  listActive(organizationId: string): Promise<RecurringBill[]>;
  create(data: CreateRecurringBillInput): Promise<RecurringBill>;
  deactivate(id: string): Promise<RecurringBill>;
}
