"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Eye,
  MoreHorizontal,
  Receipt,
  XCircle,
} from "lucide-react";
import { useAccountsPayable } from "./use-accounts-payable";
import { useCancelAccountsPayable } from "./use-cancel-accounts-payable";
import { PayAccountsPayableDialog } from "./pay-accounts-payable-dialog";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { formatCurrencyBRL, formatSmartDueDate } from "@/shared/lib/format";
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
import { toast } from "sonner";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

export type StatusFilter = "ALL" | "PENDING" | "OVERDUE" | "PAID" | "CANCELLED";

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

export function AccountsPayableTable({
  canPay,
  canCreate,
  status,
  categoryId,
  search,
  dueDateFrom,
  dueDateTo,
  onView,
  onDuplicate,
  onCreateNew,
}: {
  canPay: boolean;
  canCreate: boolean;
  status: StatusFilter;
  categoryId?: string;
  search?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  onView: (payable: AccountsPayableResponseDTO) => void;
  onDuplicate: (payable: AccountsPayableResponseDTO) => void;
  onCreateNew: () => void;
}) {
  const [page, setPage] = useState(1);
  const [payingId, setPayingId] = useState<string | null>(null);

  const { data, isLoading } = useAccountsPayable({
    status: status === "ALL" ? undefined : status,
    categoryId,
    search,
    dueDateFrom,
    dueDateTo,
    page,
  });
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();
  const cancelAccountsPayable = useCancelAccountsPayable();

  const supplierById = new Map(suppliers?.map((s) => [s.id, s]));
  const categoryById = new Map(categories?.map((c) => [c.id, c]));

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
    <>
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
          action={
            canCreate && (
              <Button type="button" size="sm" onClick={onCreateNew}>
                Nova Conta
              </Button>
            )
          }
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
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((payable) => {
                  const badge = STATUS_BADGE[payable.displayStatus];
                  const category = categoryById.get(payable.categoryId);
                  const canPayThis =
                    canPay &&
                    (payable.displayStatus === "PENDING" ||
                      payable.displayStatus === "OVERDUE");

                  return (
                    <TableRow
                      key={payable.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => onView(payable)}
                    >
                      <TableCell className="text-muted-foreground">
                        {formatSmartDueDate(payable.dueDate)}
                      </TableCell>
                      <TableCell>
                        {supplierById.get(payable.supplierId)?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {category ? (
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: category.color,
                              color: category.color,
                            }}
                          >
                            {category.name}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrencyBRL(payable.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Ações</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView(payable)}>
                              <Eye className="h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            {canCreate && (
                              <DropdownMenuItem
                                onClick={() => onDuplicate(payable)}
                              >
                                <Copy className="h-4 w-4" />
                                Duplicar
                              </DropdownMenuItem>
                            )}
                            {canPayThis && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => setPayingId(payable.id)}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Confirmar pagamento
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => handleCancel(payable.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                  Cancelar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      <PayAccountsPayableDialog
        accountsPayableId={payingId}
        open={payingId !== null}
        onOpenChange={(open) => !open && setPayingId(null)}
      />
    </>
  );
}
