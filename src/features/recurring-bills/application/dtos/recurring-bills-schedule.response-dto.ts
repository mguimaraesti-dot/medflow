import { toMoneyString } from "@/shared/lib/money";
import type { PayableStatus } from "@/features/accounts-payable/domain/accounts-payable.entity";
import type {
  RecurringBillScheduleRow,
  RecurringBillsScheduleResult,
} from "../get-recurring-bills-schedule.use-case";
import type { RecurrencePeriodicity } from "../../domain/recurring-bill.entity";

export interface RecurringBillScheduleRowDTO {
  recurringBillId: string;
  supplierId: string;
  categoryId: string;
  description: string;
  periodicity: RecurrencePeriodicity;
  accountsPayableId: string | null;
  dueDate: Date | null;
  amount: string | null;
  status: PayableStatus | null;
}

export interface RecurringBillsScheduleResponseDTO {
  rows: RecurringBillScheduleRowDTO[];
  summary: {
    totalPrevisto: string;
    quantidade: number;
    maiorDespesa: { description: string; amount: string } | null;
    proximaGeracao: { description: string; dueDate: Date } | null;
  };
}

function toRowDTO(row: RecurringBillScheduleRow): RecurringBillScheduleRowDTO {
  return {
    recurringBillId: row.recurringBillId,
    supplierId: row.supplierId,
    categoryId: row.categoryId,
    description: row.description,
    periodicity: row.periodicity,
    accountsPayableId: row.accountsPayableId,
    dueDate: row.dueDate,
    amount: toMoneyString(row.amount),
    status: row.status,
  };
}

export function toRecurringBillsScheduleResponseDTO(
  result: RecurringBillsScheduleResult,
): RecurringBillsScheduleResponseDTO {
  return {
    rows: result.rows.map(toRowDTO),
    summary: {
      totalPrevisto: toMoneyString(result.summary.totalPrevisto) as string,
      quantidade: result.summary.quantidade,
      maiorDespesa: result.summary.maiorDespesa
        ? {
            description: result.summary.maiorDespesa.description,
            amount: toMoneyString(result.summary.maiorDespesa.amount) as string,
          }
        : null,
      proximaGeracao: result.summary.proximaGeracao,
    },
  };
}
