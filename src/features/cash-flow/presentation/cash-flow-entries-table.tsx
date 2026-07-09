"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Receipt, Search } from "lucide-react";
import { useCashFlowEntries } from "./use-cash-flow-entries";
import { CashFlowEntryDetailDrawer } from "./cash-flow-entry-detail-drawer";
import { ReverseEntryDialog } from "./reverse-entry-dialog";
import { usePaymentMethods } from "@/features/payment-methods/presentation/use-payment-methods";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { formatCurrencyBRL, formatTimeBR } from "@/shared/lib/format";
import { getPaymentMethodIcon } from "@/shared/lib/lucide-icon-map";
import { cn } from "@/shared/lib/utils";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { CashFlowEntryResponseDTO } from "../application/dtos/cash-flow-entry.response-dto";

type QuickFilter = "IN" | "OUT" | "CASH" | "PIX" | "REVERSED";

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: "IN", label: "Entradas" },
  { value: "OUT", label: "Saídas" },
  { value: "CASH", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "REVERSED", label: "Estornados" },
];

/** Paciente (Entrada) ou Justificativa (Saída) — nunca os dois ao mesmo tempo. */
function patientOrReason(entry: CashFlowEntryResponseDTO): string {
  return entry.type === "IN"
    ? entry.patientName || "—"
    : entry.withdrawalReason || "—";
}

export function CashFlowEntriesTable({
  cashRegisterDayId,
  isClosedToday,
  canReverse,
}: {
  cashRegisterDayId: string | undefined;
  isClosedToday: boolean;
  canReverse: boolean;
}) {
  const [selectedEntry, setSelectedEntry] =
    useState<CashFlowEntryResponseDTO | null>(null);
  const [reversingEntryId, setReversingEntryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<QuickFilter | null>(null);

  // Tela já escopada ao dia aberto (não há navegação entre dias) — busca
  // tudo de uma vez (mesmo teto já usado em outros pontos desta tela pra
  // "o dia inteiro") e filtra/busca no cliente, sem paginação.
  const { data, isLoading } = useCashFlowEntries(
    { cashRegisterDayId, pageSize: 100 },
    { enabled: Boolean(cashRegisterDayId) },
  );
  const { data: paymentMethods } = usePaymentMethods();
  const paymentMethodById = useMemo(
    () => new Map(paymentMethods?.map((method) => [method.id, method])),
    [paymentMethods],
  );
  const { data: categories } = useCategories();
  const categoryById = useMemo(
    () => new Map(categories?.map((category) => [category.id, category])),
    [categories],
  );

  const isNeverOpenedToday = !cashRegisterDayId && !isClosedToday && !isLoading;

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    const searchLower = search.trim().toLowerCase();

    return items.filter((entry) => {
      if (activeFilter === "IN" && entry.type !== "IN") return false;
      if (activeFilter === "OUT" && entry.type !== "OUT") return false;
      if (activeFilter === "REVERSED" && !entry.isReversed) return false;
      if (
        (activeFilter === "CASH" || activeFilter === "PIX") &&
        paymentMethodById.get(entry.paymentMethodId)?.name !==
          (activeFilter === "CASH" ? "Dinheiro" : "PIX")
      ) {
        return false;
      }

      if (!searchLower) return true;
      const haystack = [
        entry.description,
        entry.patientName,
        entry.withdrawalReason,
        categoryById.get(entry.categoryId)?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchLower);
    });
  }, [data?.items, search, activeFilter, paymentMethodById, categoryById]);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Lançamentos</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-[280px]">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Pesquisar lançamentos..."
              className="h-10 rounded-xl pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Badge
            variant="default"
            className="h-9 gap-1.5 rounded-full px-3 text-sm"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Hoje
          </Badge>
          {QUICK_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              size="sm"
              variant={activeFilter === filter.value ? "default" : "outline"}
              className={cn(
                "rounded-full transition-colors duration-200",
                activeFilter !== filter.value && "text-muted-foreground",
              )}
              onClick={() =>
                setActiveFilter((current) =>
                  current === filter.value ? null : filter.value,
                )
              }
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}

        {!isLoading &&
          (isNeverOpenedToday ||
            isClosedToday ||
            filteredItems.length === 0) && (
            <EmptyState
              icon={Receipt}
              title={
                isNeverOpenedToday
                  ? "Nenhum caixa aberto hoje."
                  : isClosedToday
                    ? "Nenhum lançamento hoje."
                    : "Nenhuma movimentação encontrada."
              }
              description={
                isNeverOpenedToday
                  ? "Abra o caixa para começar a lançar."
                  : isClosedToday
                    ? "O caixa de hoje já foi fechado."
                    : "Ajuste a busca ou os filtros aplicados."
              }
            />
          )}

        {!isLoading && !isClosedToday && filteredItems.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Paciente / Justificativa</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((entry) => {
                  const paymentMethod = paymentMethodById.get(
                    entry.paymentMethodId,
                  );
                  const PaymentMethodIcon = getPaymentMethodIcon(
                    paymentMethod?.name ?? "",
                  );
                  const category = categoryById.get(entry.categoryId);
                  const canReverseEntry =
                    canReverse && !entry.isReversed && !entry.reversalOfEntryId;
                  return (
                    <TableRow
                      key={entry.id}
                      className="hover:bg-muted/50 h-16 cursor-pointer transition-shadow hover:shadow-[inset_3px_0_0_0_var(--primary)]"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <TableCell className="text-muted-foreground">
                        {formatTimeBR(entry.occurredAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge
                            variant={
                              entry.type === "IN" ? "default" : "destructive"
                            }
                          >
                            {entry.type === "IN" ? "Entrada" : "Saída"}
                          </Badge>
                          {entry.isReversed && (
                            <Badge variant="secondary">Estornado</Badge>
                          )}
                          {entry.reversalOfEntryId && (
                            <Badge variant="outline">Estorno</Badge>
                          )}
                        </div>
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
                        {patientOrReason(entry)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <PaymentMethodIcon className="h-3.5 w-3.5" />
                          {paymentMethod?.name ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell
                        className={
                          "text-right text-base font-semibold " +
                          (entry.type === "IN"
                            ? "text-green-600 dark:text-green-500"
                            : "text-destructive")
                        }
                      >
                        {entry.type === "IN" ? "+" : "-"}
                        {formatCurrencyBRL(entry.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.createdByUserName}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {canReverseEntry && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setReversingEntryId(entry.id)}
                          >
                            Estornar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <CashFlowEntryDetailDrawer
        entry={selectedEntry}
        open={selectedEntry !== null}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
        canReverse={canReverse}
      />
      <ReverseEntryDialog
        entryId={reversingEntryId}
        open={reversingEntryId !== null}
        onOpenChange={(open) => !open && setReversingEntryId(null)}
      />
    </Card>
  );
}
