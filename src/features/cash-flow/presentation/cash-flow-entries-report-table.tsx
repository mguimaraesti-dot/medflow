"use client";

import { useMemo, useState } from "react";
import { Receipt, Search } from "lucide-react";
import { useCashFlowEntries } from "./use-cash-flow-entries";
import { CashFlowEntryDetailDrawer } from "./cash-flow-entry-detail-drawer";
import { useCategories } from "@/features/categories/presentation/use-categories";
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
import type { CashFlowEntryResponseDTO } from "../application/dtos/cash-flow-entry.response-dto";

function descriptionOf(entry: CashFlowEntryResponseDTO): string {
  return (
    entry.patientName || entry.withdrawalReason || entry.description || "—"
  );
}

/**
 * Tabela genérica de lançamentos de caixa por período — cobre 2 itens
 * do catálogo (Fluxo Financeiro e Movimentações do Caixa), que mostram
 * exatamente os mesmos dados: só o `title` (usado na exportação) muda
 * conforme de onde foi aberta.
 */
export function CashFlowEntriesReportTable({
  title,
  dateFrom,
  dateTo,
}: {
  title: string;
  dateFrom: Date;
  dateTo: Date;
}) {
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] =
    useState<CashFlowEntryResponseDTO | null>(null);

  const { data, isLoading } = useCashFlowEntries({
    dateFrom,
    dateTo,
    pageSize: 500,
  });
  const { data: categories } = useCategories();
  const categoryById = useMemo(
    () => new Map(categories?.map((category) => [category.id, category])),
    [categories],
  );

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    const searchLower = search.trim().toLowerCase();
    if (!searchLower) return items;
    return items.filter((entry) => {
      const haystack = [
        descriptionOf(entry),
        categoryById.get(entry.categoryId)?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchLower);
    });
  }, [data?.items, search, categoryById]);

  const columns: ReportExportColumn<CashFlowEntryResponseDTO>[] = [
    { header: "Data", accessor: (entry) => formatDateOnlyBR(entry.occurredAt) },
    {
      header: "Tipo",
      accessor: (entry) => (entry.type === "IN" ? "Entrada" : "Saída"),
    },
    {
      header: "Categoria",
      accessor: (entry) => categoryById.get(entry.categoryId)?.name ?? "—",
    },
    { header: "Descrição", accessor: descriptionOf },
    {
      header: "Valor",
      accessor: (entry) =>
        `${entry.type === "IN" ? "" : "-"}${formatCurrencyBRL(entry.amount)}`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-[280px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Pesquisar por descrição ou categoria..."
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
          icon={Receipt}
          title="Nenhuma movimentação encontrada."
          description="Ajuste o período ou a busca aplicada."
        />
      )}

      {!isLoading && filteredItems.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((entry) => {
                const category = categoryById.get(entry.categoryId);
                return (
                  <TableRow key={entry.id} className="hover:bg-muted/50">
                    <TableCell className="text-muted-foreground">
                      {formatDateOnlyBR(entry.occurredAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry.type === "IN" ? "default" : "destructive"
                        }
                      >
                        {entry.type === "IN" ? "Entrada" : "Saída"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: category?.color ?? "#64748B",
                          }}
                        />
                        {category?.name ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {descriptionOf(entry)}
                    </TableCell>
                    <TableCell
                      className={
                        "text-right font-semibold tabular-nums " +
                        (entry.type === "IN"
                          ? "text-green-600 dark:text-green-500"
                          : "text-destructive")
                      }
                    >
                      {entry.type === "IN" ? "+" : "-"}
                      {formatCurrencyBRL(entry.amount)}
                    </TableCell>
                    <TableCell>
                      <ReportRowActions
                        title={title}
                        columns={columns}
                        row={entry}
                        onView={() => setSelectedEntry(entry)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CashFlowEntryDetailDrawer
        entry={selectedEntry}
        open={selectedEntry !== null}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
        canReverse={false}
      />
    </div>
  );
}
