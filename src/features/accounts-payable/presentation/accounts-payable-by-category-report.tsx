"use client";

import { Tags } from "lucide-react";
import { useAccountsPayableByCategory } from "./use-accounts-payable-by-category";
import { formatCurrencyBRL } from "@/shared/lib/format";
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
import type { AccountsPayableByCategoryItemResponseDTO } from "../application/dtos/accounts-payable-by-category.response-dto";

/** Despesas por Categoria (Contas a Pagar) — tabela, sem gráfico (regra da Central de Relatórios). */
export function AccountsPayableByCategoryReport({
  title,
  dateFrom,
  dateTo,
}: {
  title: string;
  dateFrom: Date;
  dateTo: Date;
}) {
  const { data, isLoading } = useAccountsPayableByCategory({
    dateFrom,
    dateTo,
  });
  const items = [...(data ?? [])].sort(
    (a, b) => Number(b.total) - Number(a.total),
  );

  const columns: ReportExportColumn<AccountsPayableByCategoryItemResponseDTO>[] =
    [
      { header: "Categoria", accessor: (item) => item.categoryName },
      { header: "Total", accessor: (item) => formatCurrencyBRL(item.total) },
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
          icon={Tags}
          title="Nenhuma despesa encontrada."
          description="Ajuste o período selecionado."
        />
      )}

      {!isLoading && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.categoryId} className="hover:bg-muted/50">
                  <TableCell className="text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.categoryName}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrencyBRL(item.total)}
                  </TableCell>
                  <TableCell>
                    <ReportRowActions
                      title={title}
                      columns={columns}
                      row={item}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
