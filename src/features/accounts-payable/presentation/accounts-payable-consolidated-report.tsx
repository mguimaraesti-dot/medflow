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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
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

type DateField = "due" | "paid";
type PaymentOriginFilter = "ALL" | "BANCO" | "COFRE";

function paymentOriginLabel(
  origin: AccountsPayableResponseDTO["paymentOrigin"],
) {
  return origin === "COFRE" ? "🟢 Cofre" : "🏦 Dr. Flávio";
}

/**
 * Relatório de Contas a Pagar consolidado (Central de Relatórios v2) —
 * Pagas + Pendentes + Vencidas juntas (nunca Canceladas), com filtros
 * combináveis (Categoria/Fornecedor/Origem do Pagamento) e toggle de
 * qual data o período filtra (Vencimento x Pago em). Reaproveita
 * `useAccountsPayable` e o Drawer já existentes — só a combinação de
 * filtros é nova.
 */
export function AccountsPayableConsolidatedReport({
  title,
  dateFrom,
  dateTo,
}: {
  title: string;
  dateFrom: Date;
  dateTo: Date;
}) {
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [paymentOrigin, setPaymentOrigin] =
    useState<PaymentOriginFilter>("ALL");
  const [dateField, setDateField] = useState<DateField>("due");
  const [viewingPayable, setViewingPayable] =
    useState<AccountsPayableResponseDTO | null>(null);

  const { data, isLoading } = useAccountsPayable({
    excludeCancelled: true,
    categoryId,
    supplierId,
    ...(paymentOrigin !== "ALL" && { paymentOrigin }),
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
      header: "Origem",
      accessor: (payable) => paymentOriginLabel(payable.paymentOrigin),
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
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <Select
          value={categoryId ?? "ALL"}
          onValueChange={(value) =>
            setCategoryId(value === "ALL" ? undefined : value)
          }
        >
          <SelectTrigger size="sm" className="w-full lg:w-[160px]">
            <SelectValue>
              {categoryId
                ? (categoryById.get(categoryId)?.name ?? "—")
                : "Categoria"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as categorias</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={supplierId ?? "ALL"}
          onValueChange={(value) =>
            setSupplierId(value === "ALL" ? undefined : value)
          }
        >
          <SelectTrigger size="sm" className="w-full lg:w-[180px]">
            <SelectValue>
              {supplierId
                ? (supplierById.get(supplierId)?.name ?? "—")
                : "Fornecedor"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os fornecedores</SelectItem>
            {suppliers?.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={paymentOrigin}
          onValueChange={(value) =>
            setPaymentOrigin(value as PaymentOriginFilter)
          }
        >
          <SelectTrigger size="sm" className="w-full lg:w-[160px]">
            <SelectValue>
              {paymentOrigin === "ALL"
                ? "Origem do Pagamento"
                : paymentOrigin === "COFRE"
                  ? "🟢 Cofre"
                  : "🏦 Dr. Flávio"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as origens</SelectItem>
            <SelectItem value="BANCO">🏦 Dr. Flávio</SelectItem>
            <SelectItem value="COFRE">🟢 Cofre</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={dateField}
          onValueChange={(value) => setDateField(value as DateField)}
        >
          <SelectTrigger size="sm" className="w-full lg:w-[150px]">
            <SelectValue>
              {dateField === "due" ? "Por Vencimento" : "Por Pagamento"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due">Por Vencimento</SelectItem>
            <SelectItem value="paid">Por Pagamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          description="Ajuste os filtros ou o período selecionado."
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
                <TableHead>Origem</TableHead>
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
                    <TableCell className="text-muted-foreground">
                      {paymentOriginLabel(payable.paymentOrigin)}
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
