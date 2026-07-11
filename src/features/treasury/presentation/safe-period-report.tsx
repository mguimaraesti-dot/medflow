"use client";

import { Landmark } from "lucide-react";
import { useSafePeriodSummary } from "./use-safe-period-summary";
import { useSafeMovements } from "./use-safe-movements";
import {
  categoryLabel,
  describeMovement,
  isMovementIn,
  signedAmount,
} from "./safe-movement-display";
import { formatCurrencyBRL, formatDateOnlyLocalBR } from "@/shared/lib/format";
import { EmptyState } from "@/shared/components/empty-state";
import { ReportExportMenu } from "@/shared/components/report-export-menu";
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
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

/**
 * Relatório de Cofre (Central de Relatórios v2) — saldo inicial/final do
 * período + lista de movimentações confirmadas. Só considera `CONFIRMED`
 * (mesmo filtro usado no cálculo do saldo em `getSafePeriodSummaryUseCase`),
 * pra a soma da lista bater com os cards de resumo.
 */
export function SafePeriodReport({
  title,
  dateFrom,
  dateTo,
}: {
  title: string;
  dateFrom: Date;
  dateTo: Date;
}) {
  const { data: summary, isLoading: isSummaryLoading } = useSafePeriodSummary(
    dateFrom,
    dateTo,
  );
  const { data: movements, isLoading: isMovementsLoading } = useSafeMovements({
    status: "CONFIRMED",
    createdAtFrom: dateFrom,
    createdAtTo: dateTo,
    pageSize: 500,
  });

  const items = movements?.items ?? [];

  const columns: ReportExportColumn<SafeMovementResponseDTO>[] = [
    {
      header: "Data",
      accessor: (movement) => formatDateOnlyLocalBR(movement.createdAt),
    },
    { header: "Motivo/Categoria", accessor: describeMovement },
    { header: "Categoria", accessor: categoryLabel },
    {
      header: "Responsável",
      accessor: (movement) => movement.performedByUserName,
    },
    {
      header: "Valor",
      accessor: (movement) =>
        `${isMovementIn(movement) ? "+" : "-"}${formatCurrencyBRL(Math.abs(signedAmount(movement)))}`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="bg-muted/30 rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs">Saldo Inicial</p>
          <p className="text-lg font-bold tabular-nums">
            {summary && !isSummaryLoading
              ? formatCurrencyBRL(summary.openingBalance)
              : "—"}
          </p>
        </div>
        <div className="bg-muted/30 rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs">Entradas</p>
          <p className="text-lg font-bold text-green-600 tabular-nums dark:text-green-500">
            {summary && !isSummaryLoading
              ? formatCurrencyBRL(summary.totalIn)
              : "—"}
          </p>
        </div>
        <div className="bg-muted/30 rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs">Saídas</p>
          <p className="text-destructive text-lg font-bold tabular-nums">
            {summary && !isSummaryLoading
              ? formatCurrencyBRL(summary.totalOut)
              : "—"}
          </p>
        </div>
        <div className="bg-muted/30 rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs">Saldo Final</p>
          <p className="text-primary text-lg font-bold tabular-nums">
            {summary && !isSummaryLoading
              ? formatCurrencyBRL(summary.closingBalance)
              : "—"}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <ReportExportMenu title={title} columns={columns} rows={items} />
      </div>

      {isMovementsLoading && (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {!isMovementsLoading && items.length === 0 && (
        <EmptyState
          icon={Landmark}
          title="Nenhuma movimentação encontrada."
          description="Ajuste o período selecionado."
        />
      )}

      {!isMovementsLoading && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((movement) => {
                const isIn = isMovementIn(movement);
                return (
                  <TableRow key={movement.id} className="hover:bg-muted/50">
                    <TableCell className="text-muted-foreground">
                      {formatDateOnlyLocalBR(movement.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {describeMovement(movement)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {categoryLabel(movement)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.performedByUserName}
                    </TableCell>
                    <TableCell
                      className={
                        "text-right font-semibold tabular-nums " +
                        (isIn
                          ? "text-green-600 dark:text-green-500"
                          : "text-destructive")
                      }
                    >
                      {isIn ? "+" : "-"}
                      {formatCurrencyBRL(Math.abs(signedAmount(movement)))}
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
