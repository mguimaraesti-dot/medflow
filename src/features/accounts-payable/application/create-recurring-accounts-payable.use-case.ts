import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayable } from "../domain/accounts-payable.entity";
import type { RecurringBillRepository } from "@/features/recurring-bills/domain/recurring-bill.repository";
import type { RecurrencePeriodicity } from "@/features/recurring-bills/domain/recurring-bill.entity";
import type { PaymentOrigin } from "../domain/accounts-payable.entity";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  recurringBillRepository: RecurringBillRepository;
}

export interface CreateRecurringAccountsPayableInput {
  supplierId: string;
  categoryId: string;
  description: string;
  amount: number;
  firstDueDate: Date;
  barcode?: string;
  digitableLine?: string;
  pixKey?: string;
  qrCodeUrl?: string;
  boletoPdfUrl?: string;
  paymentOrigin: PaymentOrigin;
  periodicity: RecurrencePeriodicity;
  /** undefined = sem prazo — gera um lote fixo de próximas ocorrências (`UNLIMITED_BATCH_SIZE`). */
  maxOccurrences?: number;
}

export interface CreateRecurringAccountsPayableResult {
  recurringBillId: string;
  payables: AccountsPayable[];
}

/**
 * Não existe cron/job agendado no projeto — a geração das ocorrências
 * futuras acontece toda de uma vez, aqui, no cadastro (decisão de escopo
 * combinada). "Sem prazo" gera um lote fixo (não dá pra gerar infinitas
 * linhas); o usuário pode cadastrar mais depois se precisar.
 */
const UNLIMITED_BATCH_SIZE = 12;

function addPeriod(
  date: Date,
  periodicity: RecurrencePeriodicity,
  times: number,
): Date {
  const result = new Date(date);
  switch (periodicity) {
    case "WEEKLY":
      result.setUTCDate(result.getUTCDate() + 7 * times);
      return result;
    case "BIWEEKLY":
      result.setUTCDate(result.getUTCDate() + 14 * times);
      return result;
    case "YEARLY":
      result.setUTCFullYear(result.getUTCFullYear() + times);
      return result;
    case "MONTHLY":
    default:
      result.setUTCMonth(result.getUTCMonth() + times);
      return result;
  }
}

export async function createRecurringAccountsPayableUseCase(
  input: CreateRecurringAccountsPayableInput,
  createdByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<CreateRecurringAccountsPayableResult> {
  const occurrenceCount = input.maxOccurrences ?? UNLIMITED_BATCH_SIZE;

  const recurringBill = await deps.recurringBillRepository.create({
    organizationId,
    supplierId: input.supplierId,
    categoryId: input.categoryId,
    description: input.description,
    amount: input.amount.toFixed(2),
    dueDay: Math.min(input.firstDueDate.getUTCDate(), 28),
    periodicity: input.periodicity,
    maxOccurrences: input.maxOccurrences,
    firstDueDate: input.firstDueDate,
  });

  // Um único INSERT em lote (createMany) para todas as ocorrências, em vez
  // de uma create() sequencial por ocorrência — evita até ~240 idas ao
  // banco numa recorrência longa (maxOccurrences alto).
  const occurrencesData = Array.from({ length: occurrenceCount }, (_, i) => {
    const isFirst = i === 0;
    return {
      organizationId,
      supplierId: input.supplierId,
      categoryId: input.categoryId,
      description: input.description,
      amount: input.amount.toFixed(2),
      dueDate: addPeriod(input.firstDueDate, input.periodicity, i),
      // Cada ocorrência tem boleto/PIX próprios (nota fiscal e comprovante
      // diferentes) — só a 1ª conta (a que o usuário está cadastrando
      // agora) recebe os dados digitados no formulário.
      barcode: isFirst ? input.barcode : undefined,
      digitableLine: isFirst ? input.digitableLine : undefined,
      pixKey: isFirst ? input.pixKey : undefined,
      qrCodeUrl: isFirst ? input.qrCodeUrl : undefined,
      boletoPdfUrl: isFirst ? input.boletoPdfUrl : undefined,
      // Diferente de barcode/pixKey/qrCodeUrl (próprios de cada ocorrência):
      // origem do pagamento é característica de como a série inteira será
      // paga, então vale igual pra todas as ocorrências geradas.
      paymentOrigin: input.paymentOrigin,
      recurringBillId: recurringBill.id,
      occurrenceNumber: i + 1,
      createdByUserId,
    };
  });

  const payables =
    await deps.accountsPayableRepository.createMany(occurrencesData);

  // Um único INSERT em lote pro histórico de todas as ocorrências, em vez
  // de um auditLog.create() sequencial por ocorrência.
  await prisma.auditLog.createMany({
    data: payables.map((payable, i) => ({
      userId: createdByUserId,
      entity: "AccountsPayable",
      entityId: payable.id,
      action: "CREATE" as const,
      reason:
        i === 0 ? undefined : "Conta criada automaticamente por recorrência.",
      after: {
        description: payable.description,
        amount: input.amount.toFixed(2),
        occurrenceNumber: payable.occurrenceNumber,
      },
    })),
  });

  logger.info("Recorrência criada com ocorrências geradas", {
    organizationId,
    recurringBillId: recurringBill.id,
    occurrenceCount,
  });

  return { recurringBillId: recurringBill.id, payables };
}
