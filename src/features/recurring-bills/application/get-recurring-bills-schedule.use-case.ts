import { Prisma } from "@prisma/client";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { AccountsPayable } from "@/features/accounts-payable/domain/accounts-payable.entity";
import type { RecurringBillRepository } from "../domain/recurring-bill.repository";
import type { RecurrencePeriodicity } from "../domain/recurring-bill.entity";

interface Deps {
  recurringBillRepository: RecurringBillRepository;
  accountsPayableRepository: AccountsPayableRepository;
}

export interface RecurringBillScheduleRow {
  recurringBillId: string;
  supplierId: string;
  categoryId: string;
  description: string;
  periodicity: RecurrencePeriodicity;
  /** `null` quando a recorrência não tem ocorrência real gerada nesse mês (exibir "-" no vencimento). */
  accountsPayableId: string | null;
  dueDate: Date | null;
  amount: Prisma.Decimal | null;
  status: AccountsPayable["status"] | null;
}

export interface RecurringBillsScheduleSummary {
  totalPrevisto: Prisma.Decimal;
  quantidade: number;
  maiorDespesa: { description: string; amount: Prisma.Decimal } | null;
  proximaGeracao: { description: string; dueDate: Date } | null;
}

export interface RecurringBillsScheduleResult {
  rows: RecurringBillScheduleRow[];
  summary: RecurringBillsScheduleSummary;
}

/**
 * Programação financeira de um mês/ano específico — só sobre ocorrências
 * REAIS já geradas (decisão de escopo: sem simular datas além do que já
 * foi batch-gerado no cadastro, já que não há cron real). Uma recorrência
 * ativa sem ocorrência gerada naquele mês aparece como uma linha com
 * `dueDate: null` ("-" na UI).
 */
export async function getRecurringBillsScheduleUseCase(
  month: number,
  year: number,
  organizationId: string,
  deps: Deps,
): Promise<RecurringBillsScheduleResult> {
  const bills = await deps.recurringBillRepository.listActive(organizationId);

  const emptySummary: RecurringBillsScheduleSummary = {
    totalPrevisto: new Prisma.Decimal(0),
    quantidade: 0,
    maiorDespesa: null,
    proximaGeracao: null,
  };

  if (bills.length === 0) {
    return { rows: [], summary: emptySummary };
  }

  const dueDateFrom = new Date(Date.UTC(year, month - 1, 1));
  const dueDateTo = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const occurrences =
    await deps.accountsPayableRepository.listByRecurringBillIdsInRange(
      bills.map((bill) => bill.id),
      dueDateFrom,
      dueDateTo,
    );

  const occurrencesByBill = new Map<string, AccountsPayable[]>();
  for (const occurrence of occurrences) {
    if (!occurrence.recurringBillId) continue;
    const list = occurrencesByBill.get(occurrence.recurringBillId) ?? [];
    list.push(occurrence);
    occurrencesByBill.set(occurrence.recurringBillId, list);
  }

  const rows: RecurringBillScheduleRow[] = [];
  for (const bill of bills) {
    const matches = occurrencesByBill.get(bill.id) ?? [];
    if (matches.length === 0) {
      rows.push({
        recurringBillId: bill.id,
        supplierId: bill.supplierId,
        categoryId: bill.categoryId,
        description: bill.description,
        periodicity: bill.periodicity,
        accountsPayableId: null,
        dueDate: null,
        amount: null,
        status: null,
      });
      continue;
    }

    for (const occurrence of matches) {
      rows.push({
        recurringBillId: bill.id,
        supplierId: bill.supplierId,
        categoryId: bill.categoryId,
        description: bill.description,
        periodicity: bill.periodicity,
        accountsPayableId: occurrence.id,
        dueDate: occurrence.dueDate,
        amount: occurrence.amount,
        status: occurrence.status,
      });
    }
  }

  // "Previsto" exclui canceladas — uma ocorrência cancelada deixou de ser
  // uma despesa esperada pro período.
  const countable = rows.filter(
    (row) => row.status !== null && row.status !== "CANCELLED",
  );

  const totalPrevisto = countable.reduce(
    (sum, row) => sum.plus(row.amount as Prisma.Decimal),
    new Prisma.Decimal(0),
  );

  const maiorDespesaRow = countable.reduce<RecurringBillScheduleRow | null>(
    (biggest, row) =>
      !biggest ||
      (row.amount as Prisma.Decimal).greaterThan(
        biggest.amount as Prisma.Decimal,
      )
        ? row
        : biggest,
    null,
  );

  const nextPendingRow = countable
    .filter((row) => row.status === "PENDING")
    .reduce<RecurringBillScheduleRow | null>(
      (next, row) =>
        !next || (row.dueDate as Date) < (next.dueDate as Date) ? row : next,
      null,
    );

  return {
    rows,
    summary: {
      totalPrevisto,
      quantidade: countable.length,
      maiorDespesa: maiorDespesaRow
        ? {
            description: maiorDespesaRow.description,
            amount: maiorDespesaRow.amount as Prisma.Decimal,
          }
        : null,
      proximaGeracao: nextPendingRow
        ? {
            description: nextPendingRow.description,
            dueDate: nextPendingRow.dueDate as Date,
          }
        : null,
    },
  };
}
