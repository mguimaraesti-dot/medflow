import type { Prisma } from "@prisma/client";

export type RecurrencePeriodicity =
  "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "YEARLY";

export interface RecurringBill {
  id: string;
  organizationId: string;
  supplierId: string;
  categoryId: string;
  description: string;
  amount: Prisma.Decimal;
  dueDay: number;
  active: boolean;
  periodicity: RecurrencePeriodicity;
  /** null = sem prazo (gera um lote fixo de próximas ocorrências, sem limite definido). */
  maxOccurrences: number | null;
  /** Vencimento da 1ª ocorrência gerada — null nas recorrências antigas criadas antes desta feature. */
  firstDueDate: Date | null;
}
