import { toMoneyString } from "@/shared/lib/money";
import type { CashFlowEntry } from "../../domain/cash-flow-entry.entity";

/**
 * DTO de saída — único formato de `CashFlowEntry` autorizado a cruzar
 * para o frontend (Coding Standards, item 13.1). `amount` sai como
 * string decimal fixa, nunca como `Prisma.Decimal`.
 */
export interface CashFlowEntryResponseDTO {
  id: string;
  organizationId: string;
  cashRegisterDayId: string;
  type: CashFlowEntry["type"];
  amount: string;
  description: string | null;
  occurredAt: Date;
  categoryId: string;
  paymentMethodId: string;
  accountsPayableId: string | null;
  createdByUserId: string;
  createdAt: Date;
  isReversed: boolean;
  reversalOfEntryId: string | null;
}

export function toCashFlowEntryResponseDTO(
  entry: CashFlowEntry,
): CashFlowEntryResponseDTO {
  return {
    id: entry.id,
    organizationId: entry.organizationId,
    cashRegisterDayId: entry.cashRegisterDayId,
    type: entry.type,
    amount: toMoneyString(entry.amount) as string,
    description: entry.description,
    occurredAt: entry.occurredAt,
    categoryId: entry.categoryId,
    paymentMethodId: entry.paymentMethodId,
    accountsPayableId: entry.accountsPayableId,
    createdByUserId: entry.createdByUserId,
    createdAt: entry.createdAt,
    isReversed: entry.isReversed,
    reversalOfEntryId: entry.reversalOfEntryId,
  };
}
