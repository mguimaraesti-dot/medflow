import { Prisma } from "@prisma/client";
import type { CashFlowEntryRepository } from "../domain/cash-flow-entry.repository";

export interface CashRegisterPeriodSummary {
  cashIn: string;
  pixIn: string;
  totalIn: string;
  totalOut: string;
}

interface Deps {
  cashFlowEntryRepository: CashFlowEntryRepository;
}

/**
 * Relatório de Caixa Recepção consolidado (Central de Relatórios v2) —
 * totais do período inteiro (não dia a dia), separando Entradas em
 * Dinheiro x PIX via `paymentMethod.isCash` (mesma projeção do
 * Dashboard/Receitas x Despesas, agregada em código — Coding Standards
 * item 15). Saídas do Caixa Recepção só ocorrem em dinheiro na prática
 * (`cash-flow-entry-form.tsx` restringe as opções), mas a soma não
 * assume isso — soma todo `OUT` do período.
 */
export async function getCashRegisterPeriodSummaryUseCase(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  deps: Deps,
): Promise<CashRegisterPeriodSummary> {
  const entries = await deps.cashFlowEntryRepository.listByDateRange(
    organizationId,
    dateFrom,
    dateTo,
  );

  let cashIn = new Prisma.Decimal(0);
  let pixIn = new Prisma.Decimal(0);
  let totalOut = new Prisma.Decimal(0);

  for (const entry of entries) {
    if (entry.type === "IN") {
      if (entry.isCash) {
        cashIn = cashIn.plus(entry.amount);
      } else {
        pixIn = pixIn.plus(entry.amount);
      }
    } else {
      totalOut = totalOut.plus(entry.amount);
    }
  }

  return {
    cashIn: cashIn.toFixed(2),
    pixIn: pixIn.toFixed(2),
    totalIn: cashIn.plus(pixIn).toFixed(2),
    totalOut: totalOut.toFixed(2),
  };
}
