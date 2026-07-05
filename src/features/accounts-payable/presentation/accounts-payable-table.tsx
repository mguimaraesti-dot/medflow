"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Receipt,
  XCircle,
} from "lucide-react";
import { useAccountsPayable } from "./use-accounts-payable";
import { useCancelAccountsPayable } from "./use-cancel-accounts-payable";
import { PayAccountsPayableDialog } from "./pay-accounts-payable-dialog";
import {
  STATUS_META,
  getAccountsPayableAttachments,
  getConfirmedByLabel,
  getDueDateDisplay,
} from "./accounts-payable-helpers";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { formatCurrencyBRL, formatDateTimeBR } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { ApiError } from "@/shared/lib/api-client";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
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
export type SortField = "DUE_DATE" | "AMOUNT";
export type SortDirection = "asc" | "desc";

export interface VisibleColumns {
  category: boolean;
  confirmedBy: boolean;
  attachments: boolean;
}

const DUE_DATE_TONE_CLASS: Record<string, string> = {
  danger: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  default: "text-foreground",
};

export function AccountsPayableTable({
  canPay,
  canCreate,
  status,
  categoryId,
  search,
  dueDateFrom,
  dueDateTo,
  sortField,
  sortDirection,
  visibleColumns,
  onView,
  onEdit,
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
  sortField: SortField;
  sortDirection: SortDirection;
  visibleColumns: VisibleColumns;
  onView: (payable: AccountsPayableResponseDTO) => void;
  onEdit: (payable: AccountsPayableResponseDTO) => void;
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

  const sortedItems = useMemo(() => {
    if (!data) return [];
    const items = [...data.items];
    items.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortField === "AMOUNT") {
        return (Number(a.amount) - Number(b.amount)) * direction;
      }
      return (
        (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) *
        direction
      );
    });
    return items;
  }, [data, sortField, sortDirection]);

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
        <div className="space-y-2 p-4">
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
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Vencimento</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  {visibleColumns.category && <TableHead>Categoria</TableHead>}
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  {visibleColumns.confirmedBy && (
                    <TableHead>Confirmado por</TableHead>
                  )}
                  {visibleColumns.attachments && <TableHead>Anexos</TableHead>}
                  <TableHead className="pr-4 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((payable) => {
                  const badge = STATUS_META[payable.displayStatus];
                  const category = categoryById.get(payable.categoryId);
                  const dueDateDisplay = getDueDateDisplay(payable.dueDate);
                  const confirmedByLabel = getConfirmedByLabel(payable);
                  const attachments = getAccountsPayableAttachments(payable);
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
                      <TableCell className="pl-4">
                        <p
                          className={cn(
                            "font-medium",
                            DUE_DATE_TONE_CLASS[dueDateDisplay.tone],
                          )}
                        >
                          {dueDateDisplay.top}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {dueDateDisplay.bottom}
                        </p>
                      </TableCell>
                      <TableCell>
                        {supplierById.get(payable.supplierId)?.name ?? "—"}
                      </TableCell>
                      {visibleColumns.category && (
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
                      )}
                      <TableCell className="text-right font-medium">
                        {formatCurrencyBRL(payable.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={badge.badgeClassName}
                        >
                          {badge.label}
                        </Badge>
                      </TableCell>
                      {visibleColumns.confirmedBy && (
                        <TableCell>
                          {confirmedByLabel ? (
                            <div className="space-y-0.5">
                              <Badge variant="outline">
                                {confirmedByLabel}
                              </Badge>
                              {payable.paidAt && (
                                <p className="text-muted-foreground text-xs">
                                  {formatDateTimeBR(payable.paidAt)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.attachments && (
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          {attachments.length === 0 ? (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-muted-foreground inline-flex cursor-default items-center gap-1 text-sm">
                                  <Paperclip className="h-3.5 w-3.5" />
                                  {attachments.length}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <ul className="space-y-0.5">
                                  {attachments.map((attachment) => (
                                    <li key={attachment.url}>
                                      {attachment.name}
                                    </li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                      <TableCell
                        className="pr-4 text-right"
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
                            <DropdownMenuItem onClick={() => onEdit(payable)}>
                              <Pencil className="h-4 w-4" />
                              Editar
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

          <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Mostrando {(data.page - 1) * data.pageSize + 1} a{" "}
              {Math.min(data.page * data.pageSize, data.total)} de {data.total}{" "}
              conta(s)
            </span>
            <PageNav
              page={data.page}
              totalPages={data.totalPages}
              onChange={setPage}
            />
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

function buildPageList(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

function PageNav({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Página anterior</span>
      </Button>
      {buildPageList(page, totalPages).map((entry, index) =>
        entry === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="text-muted-foreground px-1.5 text-sm"
          >
            …
          </span>
        ) : (
          <Button
            key={entry}
            type="button"
            variant={entry === page ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => onChange(entry)}
          >
            {entry}
          </Button>
        ),
      )}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Próxima página</span>
      </Button>
    </div>
  );
}
