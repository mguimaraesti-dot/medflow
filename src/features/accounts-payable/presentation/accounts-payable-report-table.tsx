"use client";

import { useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { useAccountsPayable } from "./use-accounts-payable";
import { AccountsPayableDrawer } from "./accounts-payable-drawer";
import { STATUS_META } from "./accounts-payable-helpers";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCategories } from "@/features/categories/presentation/use-categories";
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
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";
import type { PayableStatus } from "../domain/accounts-payable.entity";

/**
 * Tabela genérica de Contas a Pagar — cobre 3 itens do catálogo
 * (Contas Pagas/Contas a Vencer/Contas Vencidas), diferenciados só por
 * `status` e por qual data o período do relatório filtra: "Contas
 * Pagas" é sobre quando o pagamento aconteceu (`paidAt`); os outros 2
 * são sobre o vencimento (`dueDate`), igual à tela normal de Contas a
 * Pagar.
 */
export function AccountsPayableReportTable({
  title,
  status,
  dateField,
  dateFrom,
  dateTo,
}: {
  title: string;
  status: PayableStatus;
  dateField: "due" | "paid";
  dateFrom: Date;
  dateTo: Date;
}) {
  const [viewingPayable, setViewingPayable] =
    useState<AccountsPayableResponseDTO | null>(null);

  const { data, isLoading } = useAccountsPayable({
    status,
    ...(dateField === "due"
      ? { dueDateFrom: dateFrom, dueDateTo: dateTo }
      : { paidAtFrom: dateFrom, paidAtTo: dateTo }),
    pageSize: 500,
  });
  const items = data?.items ?? [];

  const { data: suppliers } = useSuppliers();
  const supplierById = useMemo(
    () => new Map(suppliers?.map((supplier) => [supplier.id, supplier])),
    [suppliers],
  );
  const { data: categories } = useCategories();
  const categoryById = useMemo(
    () => new Map(categories?.map((category) => [category.id, category])),
    [categories],
  );

  const dateLabel = dateField === "due" ? "Vencimento" : "Pago em";
  const dateOf = (payable: AccountsPayableResponseDTO) =>
    dateField === "due" ? payable.dueDate : (payable.paidAt ?? payable.dueDate);

  const columns: ReportExportColumn<AccountsPayableResponseDTO>[] = [
    {
      header: dateLabel,
      accessor: (payable) => formatDateOnlyBR(dateOf(payable)),
    },
    {
      header: "Beneficiário",
      accessor: (payable) => supplierById.get(payable.supplierId)?.name ?? "—",
    },
    {
      header: "Categoria",
      accessor: (payable) => categoryById.get(payable.categoryId)?.name ?? "—",
    },
    {
      header: "Valor",
      accessor: (payable) => formatCurrencyBRL(payable.amount),
    },
    {
      header: "Status",
      accessor: (payable) => STATUS_META[payable.displayStatus].label,
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
          icon={Receipt}
          title="Nenhuma conta encontrada."
          description="Ajuste o período selecionado."
        />
      )}

      {!isLoading && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{dateLabel}</TableHead>
                <TableHead>Beneficiário</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((payable) => {
                const badge = STATUS_META[payable.displayStatus];
                return (
                  <TableRow key={payable.id} className="hover:bg-muted/50">
                    <TableCell className="text-muted-foreground">
                      {formatDateOnlyBR(dateOf(payable))}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {supplierById.get(payable.supplierId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {categoryById.get(payable.categoryId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrencyBRL(payable.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={badge.badgeClassName}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ReportRowActions
                        title={title}
                        columns={columns}
                        row={payable}
                        onView={() => setViewingPayable(payable)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AccountsPayableDrawer
        payable={viewingPayable}
        supplierName={
          viewingPayable
            ? supplierById.get(viewingPayable.supplierId)?.name
            : undefined
        }
        categoryName={
          viewingPayable
            ? categoryById.get(viewingPayable.categoryId)?.name
            : undefined
        }
        open={viewingPayable !== null}
        onOpenChange={(open) => !open && setViewingPayable(null)}
      />
    </div>
  );
}
