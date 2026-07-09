"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { useCashRegisterDays } from "./use-cash-register-days";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import { EmptyState } from "@/shared/components/empty-state";
import { ReportExportMenu } from "@/shared/components/report-export-menu";
import { ReportRowActions } from "@/shared/components/report-row-actions";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
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
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  OPEN: { label: "Aberto", variant: "default" },
  CLOSED: { label: "Fechado", variant: "secondary" },
};

export function CashRegisterHistoryTable({
  title = "Fechamento Diário",
  dateFrom,
  dateTo,
  onView,
}: {
  /** Título usado na exportação — "Fechamento Diário" fora da Central de Relatórios não muda. */
  title?: string;
  dateFrom?: Date;
  dateTo?: Date;
  onView: (day: CashRegisterDayResponseDTO) => void;
}) {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useCashRegisterDays({
    dateFrom,
    dateTo,
    pageSize: 500,
  });

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    const searchLower = search.trim().toLowerCase();
    if (!searchLower) return items;
    return items.filter((day) =>
      formatDateOnlyBR(day.date).includes(searchLower),
    );
  }, [data?.items, search]);

  const columns: ReportExportColumn<CashRegisterDayResponseDTO>[] = [
    { header: "Data", accessor: (day) => formatDateOnlyBR(day.date) },
    { header: "Status", accessor: (day) => STATUS_BADGE[day.status].label },
    {
      header: "Saldo Inicial",
      accessor: (day) => formatCurrencyBRL(day.openingBalance),
    },
    {
      header: "Saldo Final",
      accessor: (day) =>
        day.closingBalance ? formatCurrencyBRL(day.closingBalance) : "—",
    },
    {
      header: "Diferença",
      accessor: (day) =>
        day.difference !== null ? formatCurrencyBRL(day.difference) : "—",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-[280px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Pesquisar por data..."
            className="h-10 rounded-xl pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <ReportExportMenu
          title={title}
          columns={columns}
          rows={filteredItems}
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {!isLoading && filteredItems.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="Nenhum fechamento encontrado."
          description="O histórico de abertura/fechamento de caixa aparece aqui."
        />
      )}

      {!isLoading && filteredItems.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Saldo inicial</TableHead>
                  <TableHead className="text-right">Saldo final</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((day) => {
                  const badge = STATUS_BADGE[day.status];
                  const difference =
                    day.difference !== null ? Number(day.difference) : null;

                  return (
                    <TableRow
                      key={day.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => onView(day)}
                    >
                      <TableCell className="text-muted-foreground">
                        {formatDateOnlyBR(day.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyBRL(day.openingBalance)}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.closingBalance
                          ? formatCurrencyBRL(day.closingBalance)
                          : "—"}
                      </TableCell>
                      <TableCell
                        className={
                          "text-right font-medium " +
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
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <ReportRowActions
                          title={title}
                          columns={columns}
                          row={day}
                          onView={() => onView(day)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <p className="text-muted-foreground text-sm">
            {data?.total} fechamento(s)
          </p>
        </>
      )}
    </div>
  );
}
