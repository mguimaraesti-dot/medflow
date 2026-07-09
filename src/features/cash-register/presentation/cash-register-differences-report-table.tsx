"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useCashRegisterDays } from "./use-cash-register-days";
import { CashRegisterDayDetailDrawer } from "./cash-register-day-detail-drawer";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import { EmptyState } from "@/shared/components/empty-state";
import { ReportExportMenu } from "@/shared/components/report-export-menu";
import { ReportRowActions } from "@/shared/components/report-row-actions";
import { Badge } from "@/shared/ui/badge";
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
import type { CashRegisterDayResponseDTO } from "../application/dtos/cash-register-day.response-dto";

const STATUS_BADGE: Record<
  CashRegisterDayResponseDTO["status"],
  { label: string; variant: "default" | "secondary" }
> = {
  OPEN: { label: "Aberto", variant: "default" },
  CLOSED: { label: "Fechado", variant: "secondary" },
};

/** Diferenças de Caixa — mesmos dias de `list-cash-register-days`, foco em Esperado/Contado/Diferença em vez de saldo inicial/final. */
export function CashRegisterDifferencesReportTable({
  title,
  dateFrom,
  dateTo,
}: {
  title: string;
  dateFrom: Date;
  dateTo: Date;
}) {
  const [viewingDay, setViewingDay] =
    useState<CashRegisterDayResponseDTO | null>(null);

  const { data, isLoading } = useCashRegisterDays({
    dateFrom,
    dateTo,
    pageSize: 500,
  });
  const items = data?.items ?? [];

  const columns: ReportExportColumn<CashRegisterDayResponseDTO>[] = [
    { header: "Data", accessor: (day) => formatDateOnlyBR(day.date) },
    { header: "Status", accessor: (day) => STATUS_BADGE[day.status].label },
    {
      header: "Esperado",
      accessor: (day) =>
        day.expectedCashAmount
          ? formatCurrencyBRL(day.expectedCashAmount)
          : "—",
    },
    {
      header: "Contado",
      accessor: (day) =>
        day.countedAmount ? formatCurrencyBRL(day.countedAmount) : "—",
    },
    {
      header: "Diferença",
      accessor: (day) =>
        day.difference !== null ? formatCurrencyBRL(day.difference) : "—",
    },
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
          icon={AlertTriangle}
          title="Nenhum fechamento encontrado."
          description="Ajuste o período selecionado."
        />
      )}

      {!isLoading && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Esperado</TableHead>
                <TableHead className="text-right">Contado</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((day) => {
                const difference =
                  day.difference !== null ? Number(day.difference) : null;
                return (
                  <TableRow key={day.id} className="hover:bg-muted/50">
                    <TableCell className="text-muted-foreground">
                      {formatDateOnlyBR(day.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[day.status].variant}>
                        {STATUS_BADGE[day.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {day.expectedCashAmount
                        ? formatCurrencyBRL(day.expectedCashAmount)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {day.countedAmount
                        ? formatCurrencyBRL(day.countedAmount)
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={
                        "text-right font-medium tabular-nums " +
                        (difference === null
                          ? "text-muted-foreground"
                          : difference < 0
                            ? "text-destructive"
                            : "text-success")
                      }
                    >
                      {difference !== null
                        ? formatCurrencyBRL(difference)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <ReportRowActions
                        title={title}
                        columns={columns}
                        row={day}
                        onView={() => setViewingDay(day)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CashRegisterDayDetailDrawer
        day={viewingDay}
        open={viewingDay !== null}
        onOpenChange={(open) => !open && setViewingDay(null)}
      />
    </div>
  );
}
