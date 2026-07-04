"use client";

import { useState } from "react";
import { MoreHorizontal, Receipt } from "lucide-react";
import { useAccountsPayable } from "./use-accounts-payable";
import { useCancelAccountsPayable } from "./use-cancel-accounts-payable";
import { PayAccountsPayableDialog } from "./pay-accounts-payable-dialog";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import { ApiError } from "@/shared/lib/api-client";
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
import { toast } from "sonner";

type QuickFilter = "ALL" | "PENDING" | "OVERDUE" | "PAID" | "CANCELLED";

const FILTERS: { value: QuickFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "PENDING", label: "Pendentes" },
  { value: "OVERDUE", label: "Vencidas" },
  { value: "PAID", label: "Pagas" },
  { value: "CANCELLED", label: "Canceladas" },
];

const STATUS_BADGE: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PENDING: { label: "Pendente", variant: "outline" },
  OVERDUE: { label: "Vencida", variant: "destructive" },
  PAID: { label: "Paga", variant: "default" },
  CANCELLED: { label: "Cancelada", variant: "secondary" },
};

export function AccountsPayableTable({ canPay }: { canPay: boolean }) {
  const [page, setPage] = useState(1);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ALL");
  const [payingId, setPayingId] = useState<string | null>(null);

  const { data, isLoading } = useAccountsPayable({
    status: quickFilter === "ALL" ? undefined : quickFilter,
    page,
  });
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();
  const cancelAccountsPayable = useCancelAccountsPayable();

  const supplierById = new Map(suppliers?.map((s) => [s.id, s]));
  const categoryById = new Map(categories?.map((c) => [c.id, c]));

  function changeFilter(next: QuickFilter) {
    setQuickFilter(next);
    setPage(1);
  }

  async function handleCancel(id: string) {
    try {
      await cancelAccountsPayable.mutateAsync(id);
      toast.success("Conta cancelada.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível cancelar.",
      );
    }
  }

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Contas a pagar</CardTitle>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              size="sm"
              variant={filter.value === quickFilter ? "default" : "outline"}
              onClick={() => changeFilter(filter.value)}
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

        {!isLoading && data && data.items.length === 0 && (
          <EmptyState
            icon={Receipt}
            title="Nenhuma conta encontrada."
            description="As contas a pagar cadastradas aparecem aqui."
          />
        )}

        {!isLoading && data && data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((payable) => {
                    const badge = STATUS_BADGE[payable.displayStatus];
                    const canAct =
                      canPay &&
                      (payable.displayStatus === "PENDING" ||
                        payable.displayStatus === "OVERDUE");

                    return (
                      <TableRow key={payable.id} className="hover:bg-muted/50">
                        <TableCell className="text-muted-foreground">
                          {formatDateOnlyBR(payable.dueDate)}
                        </TableCell>
                        <TableCell>
                          {supplierById.get(payable.supplierId)?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {categoryById.get(payable.categoryId)?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payable.description}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrencyBRL(payable.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canAct && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Ações</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setPayingId(payable.id)}
                                >
                                  Pagar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => handleCancel(payable.id)}
                                >
                                  Cancelar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Página {data.page} de {data.totalPages} · {data.total} conta(s)
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

      <PayAccountsPayableDialog
        accountsPayableId={payingId}
        open={payingId !== null}
        onOpenChange={(open) => !open && setPayingId(null)}
      />
    </Card>
  );
}
