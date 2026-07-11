"use client";

import { useCashRegisterPeriodSummary } from "./use-cash-register-period-summary";
import { CashFlowEntriesReportTable } from "./cash-flow-entries-report-table";
import { formatCurrencyBRL } from "@/shared/lib/format";

/**
 * Relatório de Caixa Recepção consolidado (Central de Relatórios v2) —
 * totais do período inteiro (Dinheiro/PIX/Saídas), não dia a dia.
 * Reaproveita `CashFlowEntriesReportTable` (já existente) pra listagem
 * detalhada abaixo dos cards, em vez de duplicar a tabela.
 */
export function CashRegisterPeriodReport({
  title,
  dateFrom,
  dateTo,
}: {
  title: string;
  dateFrom: Date;
  dateTo: Date;
}) {
  const { data: summary, isLoading } = useCashRegisterPeriodSummary(
    dateFrom,
    dateTo,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="bg-muted/30 rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs">Entradas Dinheiro</p>
          <p className="text-lg font-bold text-green-600 tabular-nums dark:text-green-500">
            {summary && !isLoading ? formatCurrencyBRL(summary.cashIn) : "—"}
          </p>
        </div>
        <div className="bg-muted/30 rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs">Entradas PIX</p>
          <p className="text-lg font-bold text-green-600 tabular-nums dark:text-green-500">
            {summary && !isLoading ? formatCurrencyBRL(summary.pixIn) : "—"}
          </p>
        </div>
        <div className="bg-muted/30 rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs">Total de Entradas</p>
          <p className="text-primary text-lg font-bold tabular-nums">
            {summary && !isLoading ? formatCurrencyBRL(summary.totalIn) : "—"}
          </p>
        </div>
        <div className="bg-muted/30 rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs">Total de Saídas</p>
          <p className="text-destructive text-lg font-bold tabular-nums">
            {summary && !isLoading ? formatCurrencyBRL(summary.totalOut) : "—"}
          </p>
        </div>
      </div>

      <CashFlowEntriesReportTable
        title={title}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
    </div>
  );
}
