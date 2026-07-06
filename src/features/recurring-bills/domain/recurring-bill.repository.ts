import type {
  RecurrencePeriodicity,
  RecurringBill,
} from "./recurring-bill.entity";

export interface CreateRecurringBillInput {
  organizationId: string;
  supplierId: string;
  categoryId: string;
  description: string;
  amount: string; // convertido para Decimal só na infraestrutura
  dueDay: number;
  /** Só a nova tela (checkbox "Conta recorrente") define isso — o painel antigo mantém MONTHLY/sem prazo. */
  periodicity?: RecurrencePeriodicity;
  maxOccurrences?: number;
  firstDueDate?: Date;
}

export interface RecurringBillRepository {
  findById(id: string): Promise<RecurringBill | null>;
  create(data: CreateRecurringBillInput): Promise<RecurringBill>;
  deactivate(id: string): Promise<RecurringBill>;
}
