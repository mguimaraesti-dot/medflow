"use client";

import { useMemo, useState } from "react";
import { Eye, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAccountsPayable } from "./use-accounts-payable";
import { useRestoreAccountsPayable } from "./use-restore-accounts-payable";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCategories } from "@/features/categories/presentation/use-categories";
import {
  formatCurrencyBRL,
  formatDateOnlyBR,
  formatDateTimeBR,
} from "@/shared/lib/format";
import { ApiError } from "@/shared/lib/api-client";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

/**
 * Tela "Contas Excluídas" — sempre somente-leitura + Restaurar. Tabela
 * separada de propósito (não reaproveita AccountsPayableTable): colunas e
 * regras são bem diferentes (nunca editar, nunca cancelar/pagar/excluir de
 * novo), então uma tabela dedicada e simples é mais clara que ramificar a
 * tabela principal.
 */
export function DeletedAccountsPayableTable({
  onView,
}: {
  onView: (payable: AccountsPayableResponseDTO) => void;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAccountsPayable({ deletedOnly: true, page });
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();
  const restoreAccountsPayable = useRestoreAccountsPayable();

  const supplierById = useMemo(
    () => new Map(suppliers?.map((s) => [s.id, s])),
    [suppliers],
  );
  const categoryById = useMemo(
    () => new Map(categories?.map((c) => [c.id, c])),
    [categories],
  );

  async function handleRestore(id: string) {
    try {
      await restoreAccountsPayable.mutateAsync(id);
      toast.success("Conta restaurada.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível restaurar.",
      );
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={Trash2}
        title="Nenhuma conta excluída."
        description="Contas excluídas por um Administrador aparecem aqui e podem ser restauradas."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Beneficiário</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Excluída por</TableHead>
            <TableHead>Data da exclusão</TableHead>
            <TableHead className="pr-4 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((payable) => {
            const category = categoryById.get(payable.categoryId);
            return (
              <TableRow key={payable.id}>
                <TableCell className="pl-4 font-medium">
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
                <TableCell>{formatDateOnlyBR(payable.dueDate)}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {payable.deletedByUserName ?? "—"}
                    </p>
                    {payable.deletionReason && (
                      <p className="text-muted-foreground text-xs">
                        {payable.deletionReason}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {payable.deletedAt
                    ? formatDateTimeBR(payable.deletedAt)
                    : "—"}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(payable)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Visualizar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={restoreAccountsPayable.isPending}
                      onClick={() => handleRestore(payable.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restaurar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          Mostrando {(data.page - 1) * data.pageSize + 1} a{" "}
          {Math.min(data.page * data.pageSize, data.total)} de {data.total}{" "}
          conta(s)
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={data.page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={data.page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
