"use client";

import { TrendingUp } from "lucide-react";
import { useCashFlowDailyTotals } from "./use-cash-flow-daily-totals";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import { EmptyState } from "@/shared/components/empty-state";
import { ReportExportMenu } from "@/shared/components/report-export-menu";
import { ReportRowActions } from "@/shared/components/report-row-actions";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { ReportExportColumn } from "@/shared/lib/export/report-export";
import type { CashFlowDailyTotalResponseDTO } from "../application/dtos/cash-flow-daily-totals.response-dto";

/** Receitas x Despesas — totais diários de entradas/saídas no período, sem gráfico (regra da Central de Relatórios). */
export function CashFlowDailyTotalsReport({
  title,
  dateFrom,
  dateTo,
}: {
  title: string;
  dateFrom: Date;
  dateTo: Date;
}) {
  const { data, isLoading } = useCashFlowDailyTotals({ dateFrom, dateTo });
  const items = data ?? [];

  const columns: ReportExportColumn<CashFlowDailyTotalResponseDTO>[] = [
    { header: "Data", accessor: (item) => formatDateOnlyBR(item.date) },
    { header: "Entradas", accessor: (item) => formatCurrencyBRL(item.totalIn) },
    {
      header: "Saídas",
      accessor: (item) => `-${formatCurrencyBRL(item.totalOut)}`,
    },
    { header: "Saldo do Dia", accessor: (item) => formatCurrencyBRL(item.net) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ReportExportMenu title={title} columns={columns} rows={items} />
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={TrendingUp}
          title="Nenhuma movimentação encontrada."
          description="Ajuste o período selecionado."
        />
      )}

      {!isLoading && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Saídas</TableHead>
                <TableHead className="text-right">Saldo do Dia</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const net = Number(item.net);
                return (
                  <TableRow key={item.date} className="hover:bg-muted/50">
                    <TableCell className="text-muted-foreground">
                      {formatDateOnlyBR(item.date)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600 tabular-nums dark:text-green-500">
                      {formatCurrencyBRL(item.totalIn)}
                    </TableCell>
                    <TableCell className="text-destructive text-right font-semibold tabular-nums">
                      -{formatCurrencyBRL(item.totalOut)}
                    </TableCell>
                    <TableCell
                      className={
                        "text-right font-semibold tabular-nums " +
                        (net < 0 ? "text-destructive" : "text-success")
                      }
                    >
                      {formatCurrencyBRL(item.net)}
                    </TableCell>
                    <TableCell>
                      <ReportRowActions
                        title={title}
                        columns={columns}
                        row={item}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
