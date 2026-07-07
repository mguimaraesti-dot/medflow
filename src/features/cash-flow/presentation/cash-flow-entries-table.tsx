"use client";

import { useState } from "react";
import { MoreHorizontal, Receipt } from "lucide-react";
import { useCashFlowEntries } from "./use-cash-flow-entries";
import { ReverseEntryDialog } from "./reverse-entry-dialog";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { formatCurrencyBRL, formatDateTimeBR } from "@/shared/lib/format";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function CashFlowEntriesTable({
  cashRegisterDayId,
  canReverse,
}: {
  cashRegisterDayId: string | undefined;
  canReverse: boolean;
}) {
  const [page, setPage] = useState(1);
  const [reversingEntryId, setReversingEntryId] = useState<string | null>(null);

  const { data, isLoading } = useCashFlowEntries(
    { cashRegisterDayId, page },
    { enabled: Boolean(cashRegisterDayId) },
  );
  const { data: categories } = useCategories();
  const categoryById = new Map(
    categories?.map((category) => [category.id, category]),
  );

  const isTodayEmpty = !cashRegisterDayId && !isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lançamentos</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}

        {!isLoading && (isTodayEmpty || data?.items.length === 0) && (
          <EmptyState
            icon={Receipt}
            title={
              isTodayEmpty
                ? "Nenhum caixa aberto hoje."
                : "Nenhuma movimentação registrada hoje."
            }
            description={
              isTodayEmpty
                ? "Abra o caixa para começar a lançar."
                : "Os lançamentos de hoje aparecem aqui."
            }
          />
        )}

        {!isLoading && data && data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Estorno</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">
                        {formatDateTimeBR(entry.occurredAt)}
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
                              backgroundColor:
                                categoryById.get(entry.categoryId)?.color ??
                                "#64748B",
                            }}
                          />
                          {categoryById.get(entry.categoryId)?.name ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell
                        className={
                          entry.type === "IN"
                            ? "font-medium text-green-600 dark:text-green-500"
                            : "text-destructive font-medium"
                        }
                      >
                        {entry.type === "IN" ? "+" : "-"}
                        {formatCurrencyBRL(entry.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.createdByUserName}
                      </TableCell>
                      <TableCell>
                        {entry.isReversed && (
                          <Badge variant="secondary">Estornado</Badge>
                        )}
                        {entry.reversalOfEntryId && (
                          <Badge variant="outline">Estorno</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canReverse &&
                          !entry.isReversed &&
                          !entry.reversalOfEntryId && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Ações</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setReversingEntryId(entry.id)}
                                >
                                  Estornar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Página {data.page} de {data.totalPages} · {data.total}{" "}
                lançamento(s)
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <ReverseEntryDialog
        entryId={reversingEntryId}
        open={reversingEntryId !== null}
        onOpenChange={(open) => !open && setReversingEntryId(null)}
      />
    </Card>
  );
}
